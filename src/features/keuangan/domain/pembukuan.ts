import { z } from "zod";

import { formatMoney, toMinor } from "@/features/keuangan/domain/keuangan";

/**
 * Pembukuan manual kas desa.
 *
 * Catatan transaksi di luar pagu APBDes dan realisasi triwulan: kas masuk
 * (`pendapatan`) dan kas keluar (`belanja`). Angka tidak mengubah pagu
 * anggaran; saldo diturunkan dari selisih total kedua jenis.
 */

export const PEMBUKUAN_JENIS = ["pendapatan", "belanja"] as const;
export type PembukuanJenis = (typeof PEMBUKUAN_JENIS)[number];

export const PEMBUKUAN_JENIS_LABELS: Readonly<Record<PembukuanJenis, string>> = {
  pendapatan: "Pendapatan",
  belanja: "Belanja",
};

export const pembukuanFormSchema = z.object({
  tanggal: z.iso.date("Tanggal transaksi tidak valid."),
  keterangan: z
    .string()
    .trim()
    .min(3, "Keterangan wajib diisi (minimal 3 karakter).")
    .max(255, "Keterangan maksimal 255 karakter."),
  jumlah: z.coerce
    .number()
    .min(0.01, "Jumlah harus lebih dari nol.")
    .max(999999999999, "Jumlah terlalu besar."),
  jenis: z.enum(PEMBUKUAN_JENIS, { error: "Jenis transaksi tidak valid." }),
});

export type PembukuanInput = z.infer<typeof pembukuanFormSchema>;

/** Satu baris buku kas manual. */
export interface PembukuanBaris {
  id: number;
  /** Tanggal transaksi dalam format ISO `YYYY-MM-DD`. */
  tanggal: string;
  keterangan: string;
  /** Nilai uang berupa string desimal 2 angka (kolom `decimal`). */
  jumlah: string;
  jenis: PembukuanJenis;
}

export interface PembukuanRingkas {
  totalPendapatan: string;
  totalBelanja: string;
  /** Saldo berjalan = total pendapatan − total belanja (boleh negatif). */
  saldo: string;
  /** Jumlah baris transaksi. */
  jumlah: number;
}

/** Hitung total pendapatan, belanja, dan saldo dari seluruh baris. */
export function hitungRingkasPembukuan(rows: readonly PembukuanBaris[]): PembukuanRingkas {
  let pendapatan = 0n;
  let belanja = 0n;

  for (const row of rows) {
    if (row.jenis === "pendapatan") pendapatan += toMinor(row.jumlah);
    else belanja += toMinor(row.jumlah);
  }

  return {
    totalPendapatan: formatMoney(pendapatan),
    totalBelanja: formatMoney(belanja),
    saldo: formatMoney(pendapatan - belanja),
    jumlah: rows.length,
  };
}

/** Urutkan baris: tanggal terbaru dulu, `id` menurun sebagai pengikat. */
export function urutkanPembukuan(rows: readonly PembukuanBaris[]): PembukuanBaris[] {
  return [...rows].sort((a, b) =>
    a.tanggal === b.tanggal ? b.id - a.id : b.tanggal.localeCompare(a.tanggal),
  );
}

/**
 * Format `Date` menjadi ISO `YYYY-MM-DD` memakai waktu lokal.
 *
 * Kolom `tanggal` disimpan sebagai `timestamp`; memakai bagian lokal
 * memastikan tanggal kalender tidak bergeser karena perbedaan zona waktu
 * driver database.
 */
export function tanggalIsoLokal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Ubah ISO `YYYY-MM-DD` menjadi `Date` tengah malam waktu lokal. */
export function isoKeTanggalLokal(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}
