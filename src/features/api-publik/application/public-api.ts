import "server-only";

import { NextResponse } from "next/server";

import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import type { IdentitasDesa } from "@/features/desa/infrastructure/desa-repository";
import { getTenantFromRequest } from "@/features/publik/api/middleware";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { alamatIp } from "@/lib/client-ip";

export { alamatIp } from "@/lib/client-ip";

/** Batas default API publik: 60 permintaan per menit per IP per endpoint. */
export const BATAS_PER_MENIT = 60;

type PenanganApiPublik<T> = (desa: IdentitasDesa) => Promise<T>;
type FormatResponsApiPublik<T> = (hasil: T) => { data: unknown; [key: string]: unknown };

/**
 * Bungkus endpoint data publik: tenant dari host, rate limit per IP, audit
 * akses, respons JSON konsisten, dan `no-store`.
 */
export async function jalankanApiPublik<T>(
  request: Request,
  nama: string,
  ambil: PenanganApiPublik<T>,
  format?: FormatResponsApiPublik<T>,
): Promise<NextResponse> {
  const ip = alamatIp(request);
  const batas = await batasiPermintaan(`${nama}:${ip}`, { batas: BATAS_PER_MENIT });
  if (batas.dibatasi) {
    return NextResponse.json(
      { success: false, error: "Terlalu banyak permintaan. Coba lagi beberapa saat." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let desa: IdentitasDesa;
  try {
    desa = await getTenantFromRequest();
  } catch {
    return NextResponse.json(
      { success: false, error: "Desa tidak valid" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const hasil = await ambil(desa);

    await catatAkses(request, desa.id, nama, ip);

    return NextResponse.json(
      {
        success: true,
        ...(format ? format(hasil) : { data: hasil }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`Gagal melayani API publik ${nama}:`, error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data publik" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

async function catatAkses(request: Request, villageId: number, nama: string, ip: string) {
  // Impor dinamis menjaga modul ini tetap ringan dan mudah di-mock pada test.
  const { recordAuditEvent } = await import("@/features/audit/application/audit-use-cases");
  await recordAuditEvent({
    villageId,
    event: AUDIT_EVENTS.apiPublikAkses,
    resource: "api-publik",
    resourceId: nama,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
  });
}
