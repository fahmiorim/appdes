import { z } from "zod";

import { formatMoney, toMinor } from "./keuangan";

export const SISA_LEBIH_RESOURCE = "keuangan-sisa-lebih";

/** Baris APBDes yang menerima SiLPA tahun sebelumnya. */
export const SISA_LEBIH_KODE_REKENING = "6.1.1";

/**
 * Normalisasi jumlah SiLPA ke format uang kanonik (`1234.00`).
 *
 * Menerima angka polos, pemisah ribuan titik, dan desimal koma/dot. Nilai
 * negatif dan teks nonangka ditolak agar jumlah tidak pernah masuk ke APBDes
 * sebagai NaN atau angka yang berbeda dari yang terlihat.
 */
export function normalisasiJumlahSisaLebih(value: string): string | null {
  let teks = value
    .trim()
    .replace(/^Rp\s*/i, "")
    .replace(/\s/g, "");

  if (teks.includes(",")) {
    teks = teks.replace(/\./g, "").replace(",", ".");
  } else if ((teks.match(/\./g) ?? []).length > 1 || /^\d{1,3}(\.\d{3})+$/.test(teks)) {
    teks = teks.replace(/\./g, "");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(teks)) return null;
  return formatMoney(toMinor(teks));
}

export const sisaLebihFormSchema = z.object({
  tahun: z.coerce.number().int().min(2000).max(2100),
  jumlah: z
    .string()
    .trim()
    .min(1, "Jumlah wajib diisi")
    .refine(
      (value) => normalisasiJumlahSisaLebih(value) !== null,
      "Jumlah harus angka tidak negatif, maksimal dua desimal",
    )
    .transform((value) => normalisasiJumlahSisaLebih(value) ?? "0.00"),
  keterangan: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  tanggal: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type SisaLebihFormInput = z.input<typeof sisaLebihFormSchema>;
export type SisaLebihFormValues = z.infer<typeof sisaLebihFormSchema>;

export interface SisaLebihDTO {
  id: number;
  villageId: number;
  tahun: number;
  jumlah: string | null;
  keterangan: string | null;
  tanggal: string | null;
}
