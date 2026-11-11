import { z } from "zod";

export const PELANGGAN_RESOURCE = "pelanggan";

export const pelangganFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(200),
  kontak: z.string().trim().max(100).optional().nullable(),
  alamat: z.string().trim().optional().nullable(),
  keterangan: z.string().trim().optional().nullable(),
  statusLangganan: z.enum(["aktif", "nonaktif", "menunggu", "kadaluarsa"]).default("menunggu"),
  tanggalMulai: z.string().optional().nullable(),
  tanggalSelesai: z.string().optional().nullable(),
  noKerjasama: z.string().trim().max(100).optional().nullable(),
  keteranganLangganan: z.string().trim().optional().nullable(),
});

export type PelangganFormInput = z.input<typeof pelangganFormSchema>;
export type PelangganFormValues = z.infer<typeof pelangganFormSchema>;

export interface PelangganDTO {
  id: number;
  villageId: number;
  nama: string;
  kontak: string | null;
  alamat: string | null;
  keterangan: string | null;
  statusLangganan: string | null;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  noKerjasama: string | null;
  keteranganLangganan: string | null;
  dokumenKerjasama: string | null;
  dokumenNama: string | null;
  dokumenMime: string | null;
}

/** MIME yang diterima untuk dokumen kerja sama pelanggan. */
export const MIME_DOKUMEN_KERJASAMA = ["application/pdf", "image/jpeg", "image/png"] as const;

/** Batas ukuran dokumen kerja sama (5 MB). */
export const MAKS_UKURAN_DOKUMEN_KERJASAMA = 5 * 1024 * 1024;

export type HasilValidasiDokumen = { ok: true } | { ok: false; pesan: string };

/**
 * Validasi berkas dokumen kerja sama (murni, tanpa I/O).
 *
 * Sengaja lebih ketat dari media publik: hanya PDF/JPG/PNG yang diterima dan
 * besar maksimal 5 MB, karena dokumen ini berisi perjanjian kerja sama.
 */
export function validasiDokumenKerjasama(
  mime: string | null | undefined,
  ukuranByte: number,
): HasilValidasiDokumen {
  if (!mime || !(MIME_DOKUMEN_KERJASAMA as readonly string[]).includes(mime.toLowerCase())) {
    return { ok: false, pesan: "Dokumen kerja sama harus berformat PDF, JPG, atau PNG." };
  }
  if (ukuranByte <= 0) return { ok: false, pesan: "Berkas dokumen kosong." };
  if (ukuranByte > MAKS_UKURAN_DOKUMEN_KERJASAMA) {
    return { ok: false, pesan: "Ukuran dokumen maksimal 5 MB." };
  }
  return { ok: true };
}
