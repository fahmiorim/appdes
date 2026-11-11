import "server-only";

import { listJenisSuratAktifPublik } from "@/features/surat/infrastructure/master-repository";

export interface JenisSuratPublik {
  id: number;
  kode: string;
  nama: string;
  klasifikasi: string | null;
  butuhPenduduk: boolean;
  masaBerlakuBulan: number;
}

/** Jenis surat yang dapat diverifikasi publik, tanpa data template internal. */
export async function listJenisSuratPublik(villageId: number): Promise<JenisSuratPublik[]> {
  const rows = await listJenisSuratAktifPublik(villageId);

  return rows.map((row) => ({
    id: row.id,
    kode: row.code,
    nama: row.name,
    klasifikasi: row.classificationName ?? null,
    butuhPenduduk: row.requiresResident,
    masaBerlakuBulan: row.validityMonths,
  }));
}
