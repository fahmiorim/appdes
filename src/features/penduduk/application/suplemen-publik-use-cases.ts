import "server-only";

import {
  getSuplemenPublikBySlug,
  listSuplemenPublik,
  type SuplemenPublikDetail,
  type SuplemenPublikRingkas,
} from "../infrastructure/suplemen-publik-repository";

/** Label sasaran suplemen untuk halaman publik. */
export function labelSasaranPublik(sasaran: number): string {
  return sasaran === 2 ? "Keluarga (KK)" : "Penduduk";
}

export async function daftarSuplemenPublik(villageId: number): Promise<SuplemenPublikRingkas[]> {
  return listSuplemenPublik(villageId);
}

export async function detailSuplemenPublik(
  villageId: number,
  slug: string,
): Promise<SuplemenPublikDetail | null> {
  return getSuplemenPublikBySlug(villageId, slug);
}
