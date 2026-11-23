"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { kirimPengajuanRegistrasiWarga } from "@/features/registrasi-warga/application/registrasi-warga-use-cases";
import { toErrorState } from "@/lib/action-state";
import { alamatIpDariHeader } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export async function ajukanAkunWargaAction(input: { nik: string; nama: string; noHp: string }) {
  try {
    const desa = await getIdentitasFromRequest();
    const ip = alamatIpDariHeader(await headers(), env.TRUST_PROXY);
    const quotaNIK = await batasiPermintaan(`registrasi-warga-nik:${desa.id}:${input.nik}`, {
      batas: 3,
      jendelaMs: 15 * 60_000,
    });
    if (quotaNIK.dibatasi)
      throw new AppError(
        "RATE_LIMITED",
        "Terlalu banyak percobaan untuk data ini. Coba kembali 15 menit lagi.",
      );
    if (ip !== "tidak-diketahui") {
      const quotaIP = await batasiPermintaan(`registrasi-warga-ip:${desa.id}:${ip}`, {
        batas: 10,
        jendelaMs: 15 * 60_000,
      });
      if (quotaIP.dibatasi)
        throw new AppError(
          "RATE_LIMITED",
          "Terlalu banyak pengajuan dari jaringan ini. Coba kembali 15 menit lagi.",
        );
    }
    await kirimPengajuanRegistrasiWarga(desa.id, input);
    await recordAuditEvent({
      villageId: desa.id,
      event: AUDIT_EVENTS.registrasiWargaDiajukan,
      resource: "registrasi-warga",
      ipAddress: ip,
      userAgent: (await headers()).get("user-agent"),
      details: { status: "menunggu" },
    });
    revalidatePath("/daftar");
    return {
      ok: true,
      message:
        "Pengajuan terkirim. Administrator desa akan memeriksa data Anda sebelum akun diaktifkan.",
    };
  } catch (error) {
    const state = toErrorState(error);
    return {
      ok: false,
      message:
        "message" in state
          ? state.message
          : "Pengajuan belum dapat diproses. Periksa kembali data Anda.",
    };
  }
}
