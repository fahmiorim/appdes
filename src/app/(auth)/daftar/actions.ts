"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { alamatIpDariHeader } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { kirimPengajuanRegistrasiWarga } from "@/features/registrasi-warga/application/registrasi-warga-use-cases";
import { toErrorState } from "@/lib/action-state";

export async function ajukanAkunWargaAction(input: { nik: string; nama: string; noHp: string }) {
  try {
    const desa = await getIdentitasFromRequest();
    const ip = alamatIpDariHeader(await headers(), env.TRUST_PROXY);
    const quota = await batasiPermintaan(`registrasi-warga:${desa.id}:${ip}`, { batas: 3, jendelaMs: 15 * 60_000 });
    if (quota.dibatasi) throw new AppError("RATE_LIMITED", "Terlalu banyak pengajuan dari jaringan ini. Coba kembali 15 menit lagi.");
    await kirimPengajuanRegistrasiWarga(desa.id, input);
    revalidatePath("/daftar");
    return { ok: true, message: "Pengajuan terkirim. Administrator desa akan memeriksa data Anda sebelum akun diaktifkan." };
  } catch (error) {
    const state = toErrorState(error);
    return { ok: false, message: "message" in state ? state.message : "Pengajuan belum dapat diproses. Periksa kembali data Anda." };
  }
}
