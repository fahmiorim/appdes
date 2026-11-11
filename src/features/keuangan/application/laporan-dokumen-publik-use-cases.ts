import "server-only";

import {
  LAPORAN_TIPE,
  sudahDiserahkan,
  type LaporanDokumenRow,
} from "@/features/keuangan/domain/laporan-dokumen";
import {
  findLaporanDokumen,
  listLaporanDokumen,
} from "@/features/keuangan/infrastructure/laporan-dokumen-repository";
import { bacaBerkasLaporan } from "@/features/keuangan/infrastructure/laporan-storage";
import { notFound } from "@/lib/errors";

/** Dokumen APBDes yang boleh tampil di situs publik. */
export interface LaporanDokumenPublikRow {
  id: number;
  judul: string;
  tahun: number;
  semesterLabel: string;
  diserahkanPada: string;
}

function kePublik(row: LaporanDokumenRow): LaporanDokumenPublikRow | null {
  if (row.tipe !== LAPORAN_TIPE.apbdes || !sudahDiserahkan(row.diserahkanPada)) return null;

  return {
    id: row.id,
    judul: row.judul,
    tahun: row.tahun,
    semesterLabel: row.semesterLabel,
    diserahkanPada: row.diserahkanPada!,
  };
}

/**
 * Daftar dokumen laporan APBDes yang sudah diserahkan.
 *
 * Hanya dokumen berjenis APBDes dan sudah dicatat penyerahannya yang
 * dipublikasikan; draf yang belum diserahkan tetap privat.
 */
export async function listLaporanDokumenApbdesPublik(
  villageId: number,
): Promise<LaporanDokumenPublikRow[]> {
  const rows = await listLaporanDokumen(villageId);

  return rows.map(kePublik).filter((row): row is LaporanDokumenPublikRow => row !== null);
}

/**
 * Ambil berkas dokumen APBDes publik.
 *
 * `villageId` berasal dari host, bukan input klien. Dokumen desa lain, dokumen
 * non-APBDes, dan draf yang belum diserahkan diperlakukan sebagai tidak ada.
 */
export async function getBerkasLaporanDokumenApbdesPublik(villageId: number, id: number) {
  const row = await findLaporanDokumen(villageId, id);
  if (!row || row.tipe !== LAPORAN_TIPE.apbdes || !sudahDiserahkan(row.diserahkanPada)) {
    throw notFound("Dokumen laporan tidak ditemukan.");
  }

  const isi = await bacaBerkasLaporan(row.jalurFile);
  return { row, isi };
}
