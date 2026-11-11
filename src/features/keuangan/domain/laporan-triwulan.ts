import { z } from "zod";

import { formatMoney, realisasiPersen, sumMoney, toMinor } from "./keuangan";

/** Nilai realisasi per bidang untuk satu tahun anggaran. */
export interface TriwulanBarisInput {
  kode: string;
  uraian: string;
  anggaran: string;
  tw1: string;
  tw2: string;
  tw3: string;
  tw4: string;
}

export interface TriwulanBaris extends TriwulanBarisInput {
  /** Jumlah TW I–IV, bukan realisasi tahunan APBDes. */
  realisasi: string;
  selisih: string;
  persen: number;
}

/**
 * Susun baris laporan triwulan.
 *
 * Total realisasi adalah penjumlahan nilai triwulan yang benar-benar diisi;
 * tidak ada estimasi/pembagian otomatis dari realisasi tahunan.
 */
export function buildTriwulanRows(bidang: readonly TriwulanBarisInput[]): TriwulanBaris[] {
  return bidang.map((row) => {
    const realisasi = sumMoney([row.tw1, row.tw2, row.tw3, row.tw4]);

    return {
      ...row,
      realisasi,
      selisih: formatMoney(toMinor(row.anggaran) - toMinor(realisasi)),
      persen: realisasiPersen(row.anggaran, realisasi),
    };
  });
}

export interface TriwulanTotal {
  anggaran: string;
  tw1: string;
  tw2: string;
  tw3: string;
  tw4: string;
  realisasi: string;
  persen: number;
}

/** Total seluruh bidang untuk footer laporan. */
export function totalTriwulan(rows: readonly TriwulanBaris[]): TriwulanTotal {
  const anggaran = sumMoney(rows.map((row) => row.anggaran));
  const realisasi = sumMoney(rows.map((row) => row.realisasi));

  return {
    anggaran,
    tw1: sumMoney(rows.map((row) => row.tw1)),
    tw2: sumMoney(rows.map((row) => row.tw2)),
    tw3: sumMoney(rows.map((row) => row.tw3)),
    tw4: sumMoney(rows.map((row) => row.tw4)),
    realisasi,
    persen: realisasiPersen(anggaran, realisasi),
  };
}

/** Angka triwulan 1–4 dalam angka Romawi untuk label publik. */
const TRIWULAN_ROMAWI = ["I", "II", "III", "IV"] as const;

/** Label periode triwulan, mis. `1` → `"Triwulan I"`. */
export function triwulanLabel(triwulan: number): string {
  const romawi = TRIWULAN_ROMAWI[triwulan - 1];
  return romawi ? `Triwulan ${romawi}` : `Triwulan ${triwulan}`;
}

/** Ringkasan realisasi satu periode (triwulan) untuk keluaran publik. */
export interface RealisasiPeriode {
  /** Nomor triwulan 1–4. */
  triwulan: number;
  label: string;
  /** Realisasi periode tersebut (jumlah seluruh bidang). */
  realisasi: string;
  /** Porsi realisasi periode terhadap total anggaran tahunan (%). */
  persen: number;
}

/**
 * Ringkas realisasi per triwulan dari total tahunan.
 *
 * Dipakai keluaran publik APBDes untuk menampilkan dimensi periode
 * (tahun + triwulan) di samping ringkasan anggaran tahunan. Porsi `persen`
 * dihitung terhadap total anggaran agar terbaca sebagai serapan per periode.
 */
export function ringkasRealisasiPeriode(total: TriwulanTotal): RealisasiPeriode[] {
  const perTriwulan = [total.tw1, total.tw2, total.tw3, total.tw4];
  return perTriwulan.map((realisasi, index) => ({
    triwulan: index + 1,
    label: triwulanLabel(index + 1),
    realisasi,
    persen: realisasiPersen(total.anggaran, realisasi),
  }));
}

const nilaiTriwulan = z.coerce
  .number()
  .min(0, "Realisasi tidak boleh negatif.")
  .max(1_000_000_000_000, "Realisasi terlalu besar.")
  .optional()
  .default(0);

/** Validasi satu baris input realisasi triwulan (kode bidang `5.x`). */
export const triwulanBarisFormSchema = z.object({
  kode: z
    .string()
    .trim()
    .regex(/^5\.\d$/, "Hanya bidang belanja (5.x) yang dapat diisi."),
  tw1: nilaiTriwulan,
  tw2: nilaiTriwulan,
  tw3: nilaiTriwulan,
  tw4: nilaiTriwulan,
});

export type TriwulanBarisFormInput = z.infer<typeof triwulanBarisFormSchema>;
