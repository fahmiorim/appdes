import "server-only";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { hashVerificationToken, type SuratDetail } from "@/features/surat/domain/surat";
import { findSuratByTokenHash } from "@/features/surat/infrastructure/surat-repository";

/**
 * Cari surat untuk API eksternal berdasarkan token; `villageId` berasal dari API key.
 * Token yang tidak berbentuk hex 64 char langsung dianggap tidak ditemukan.
 */
export async function cariSuratEksternal(villageId: number, token: string) {
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  const tokenHash = await hashVerificationToken(token.toLowerCase());
  return findSuratByTokenHash(villageId, tokenHash);
}

/**
 * Use case publik: verifikasi surat via token.
 *
 * `villageId` berasal dari host (aturan multi-tenant), token dari URL dicocokkan
 * sebagai hash SHA-256 — bukan PK numerik — sehingga surat tidak dapat ditebak
 * dan tidak pernah bocor lintas desa.
 */
export async function verifikasiSuratPublik(token: string): Promise<{
  desa: Awaited<ReturnType<typeof getIdentitasFromRequest>>;
  surat: SuratDetail | null;
}> {
  const desa = await getIdentitasFromRequest();

  // Token yang tidak berbentuk hex 64 char pasti tidak sah; lewati query.
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return { desa, surat: null };
  }

  const tokenHash = await hashVerificationToken(token.toLowerCase());
  const surat = await findSuratByTokenHash(desa.id, tokenHash);

  return { desa, surat };
}
