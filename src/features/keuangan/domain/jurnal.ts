import { z } from "zod";

/**
 * Jurnal & saldo bank pembukuan kas desa.
 *
 * Berbeda dari `pembukuan.ts` yang memakai tabel ringkas `keuangan_transaksi`,
 * modul ini memakai pembukuan berpasangan: setiap mutasi dicatat pada satu
 * kode rekening sebagai debet **atau** kredit pada tabel `keuangan_jurnal`,
 * dan saldo awal tiap rekening bank disimpan di `keuangan_saldo_bank`.
 *
 * Validasi diletakkan di domain agar aturan yang sama berlaku dari Server
 * Action maupun pemanggil lain (sama seperti `pembukuanFormSchema`).
 */

const TAHUN_MIN = 2000;
const TAHUN_MAX = 2100;

/** Batas atas nilai rupiah; kolom `decimal(19,2)` menampung 17 digit bulat. */
const NILAI_MAKS = 9999999999999999;

const tahunSchema = z.coerce
  .number({ error: "Tahun anggaran tidak valid." })
  .int("Tahun anggaran harus bilangan bulat.")
  .min(TAHUN_MIN, `Tahun anggaran minimal ${TAHUN_MIN}.`)
  .max(TAHUN_MAX, `Tahun anggaran maksimal ${TAHUN_MAX}.`);

const nilaiSchema = (label: string) =>
  z.coerce
    .number({ error: `Nilai ${label} tidak valid.` })
    .min(0, `Nilai ${label} tidak boleh negatif.`)
    .max(NILAI_MAKS, `Nilai ${label} terlalu besar.`)
    .default(0);

/**
 * Input satu baris jurnal.
 *
 * `debet` dan `kredit` tidak boleh diisi bersamaan: satu mutasi hanya
 * menambah **atau** mengurangi kas, sehingga keduanya diharuskan salah satu.
 */
export const jurnalFormSchema = z
  .object({
    tahun: tahunSchema,
    tanggal: z.iso.date("Tanggal transaksi tidak valid."),
    kodeRekening: z
      .string()
      .trim()
      .min(1, "Kode rekening wajib diisi.")
      .max(50, "Kode rekening maksimal 50 karakter."),
    uraian: z
      .string()
      .trim()
      .min(3, "Uraian wajib diisi (minimal 3 karakter).")
      .max(2000, "Uraian maksimal 2000 karakter."),
    debet: nilaiSchema("debet"),
    kredit: nilaiSchema("kredit"),
    /** Kunci baris asal bila jurnal dibangkitkan modul lain. */
    referensi: z
      .string()
      .trim()
      .max(255, "Referensi maksimal 255 karakter.")
      .optional()
      .transform((value) => (value === "" ? undefined : value)),
  })
  .refine((row) => row.debet > 0 !== row.kredit > 0, {
    message: "Isi salah satu saja: debet atau kredit (harus lebih dari nol).",
    path: ["debet"],
  });

export type JurnalInput = z.infer<typeof jurnalFormSchema>;

/** Input saldo awal satu rekening bank pada satu tahun anggaran. */
export const saldoBankFormSchema = z.object({
  tahun: tahunSchema,
  rekeningBank: z
    .string()
    .trim()
    .min(1, "Nomor rekening wajib diisi.")
    .max(50, "Nomor rekening maksimal 50 karakter."),
  namaBank: z
    .string()
    .trim()
    .min(1, "Nama bank wajib diisi.")
    .max(100, "Nama bank maksimal 100 karakter."),
  saldoAwal: nilaiSchema("saldo awal"),
});

export type SaldoBankInput = z.infer<typeof saldoBankFormSchema>;
