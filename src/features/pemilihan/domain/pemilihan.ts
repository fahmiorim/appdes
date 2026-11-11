import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const PEMILIHAN_RESOURCE = RESOURCES.pemilihan;

export const pemilihanSchema = z.object({
  tahun: z.coerce.number().int().min(2000).max(2100),
  jenis: z.string().trim().min(1).max(50),
  tanggal: z.string().optional().nullable(),
  keterangan: z.string().trim().max(2000).optional().nullable(),
});

export type PemilihanInput = z.infer<typeof pemilihanSchema>;

export interface PemilihanDTO {
  id: number;
  villageId: number;
  tahun: number;
  jenis: string;
  tanggal: string | null;
  keterangan: string | null;
}

/** Skema validasi kandidat pemilihan (nomor urut & suara berupa angka). */
export const kandidatSchema = z.object({
  nomorUrut: z.coerce
    .number()
    .int("Nomor urut harus bilangan bulat.")
    .min(1, "Nomor urut minimal 1.")
    .max(99, "Nomor urut maksimal 99."),
  nama: z.string().trim().min(1, "Nama kandidat wajib diisi.").max(100, "Maksimal 100 karakter."),
  keterangan: z.string().trim().max(500, "Maksimal 500 karakter.").optional().nullable(),
  jumlahSuara: z.coerce
    .number()
    .int("Jumlah suara harus bilangan bulat.")
    .min(0, "Jumlah suara tidak boleh negatif.")
    .max(10_000_000, "Jumlah suara terlalu besar."),
});

export type KandidatInput = z.infer<typeof kandidatSchema>;

/** Kandidat sebuah pemilihan. */
export interface KandidatDTO {
  id: number;
  pemilihanId: number;
  nomorUrut: number;
  nama: string;
  keterangan: string | null;
  jumlahSuara: number;
}

/** Satu baris rekapitulasi suara (persentase dua desimal). */
export interface KandidatRekapRow extends KandidatDTO {
  percentage: number;
}

/** Rekap suara sebuah pemilihan. */
export interface RekapSuara {
  totalSuara: number;
  rows: KandidatRekapRow[];
  /** Nama peraih suara terbanyak; `null` bila belum ada suara atau terjadi seri. */
  pemenang: string | null;
}

/**
 * Hitung rekapitulasi perolehan suara.
 *
 * Persentase memakai total suara sah (bukan DPT) dan dibulatkan dua desimal.
 * Pemenang hanya ditetapkan bila satu kandidat unggul sendiri — suara nol atau
 * seri menghasilkan `null` agar tidak ada klaim pemenang yang keliru.
 */
export function hitungRekapSuara(kandidat: readonly KandidatDTO[]): RekapSuara {
  const totalSuara = kandidat.reduce((total, item) => total + item.jumlahSuara, 0);

  const rows = kandidat
    .map((item) => ({
      ...item,
      percentage: totalSuara === 0 ? 0 : Math.round((item.jumlahSuara / totalSuara) * 10_000) / 100,
    }))
    .sort((a, b) => b.jumlahSuara - a.jumlahSuara || a.nomorUrut - b.nomorUrut);

  const tertinggi = rows[0];
  const jumlahPemenang = tertinggi
    ? rows.filter((row) => row.jumlahSuara === tertinggi.jumlahSuara).length
    : 0;

  return {
    totalSuara,
    rows,
    pemenang:
      tertinggi && tertinggi.jumlahSuara > 0 && jumlahPemenang === 1 ? tertinggi.nama : null,
  };
}
