import { z } from "zod";

/**
 * Normalisasi domain desa.
 *
 * Menerima input seperti `https://Desa-Sukamaju.id/` dan menyimpannya sebagai
 * `desa-sukamaju.id`; string kosong berarti desa belum dipetakan ke domain.
 * Normalisasi murni supaya dapat diuji tanpa database.
 */
export function normalisasiDomain(nilai: string): string | null {
  const bersih = nilai
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  return bersih.length === 0 ? null : bersih;
}

export const POLA_DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Batas kuota media: 1 MB s.d. 1 TB (nilai kosong = tanpa batas). */
export const KUOTA_MEDIA_MIN_MB = 1;
export const KUOTA_MEDIA_MAX_MB = 1024 * 1024;

/**
 * Skema form pembuatan desa.
 *
 * `code` mengikuti panjang kode desa/kemendagri (10 digit). Domain opsional,
 * tetapi bila diisi harus berupa hostname tanpa protokol/path.
 */
export const desaBaruSchema = z.object({
  name: z.string().trim().min(3, "Nama desa minimal 3 karakter.").max(100),
  code: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Kode desa harus 10 digit angka."),
  domain: z
    .string()
    .trim()
    .max(255, "Domain maksimal 255 karakter.")
    .transform(normalisasiDomain)
    .refine(
      (domain) => domain === null || POLA_DOMAIN.test(domain),
      "Format domain tidak valid (contoh: desa-sukamaju.id).",
    ),
  district: z.string().trim().max(100).optional(),
  regency: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  headName: z.string().trim().max(100).optional(),
  adminName: z.string().trim().min(3, "Nama admin minimal 3 karakter.").max(255),
  adminUsername: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,50}$/, "Username 3–50 karakter: huruf, angka, titik, garis."),
  adminEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format email tidak valid."),
  adminPassword: z.string().min(8, "Sandi minimal 8 karakter.").max(72),
  /** Kuota media desa baru (MB); kosong = tanpa batas. */
  kuotaMediaMb: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce
      .number()
      .int("Kuota media harus bilangan bulat.")
      .min(KUOTA_MEDIA_MIN_MB, `Kuota media minimal ${KUOTA_MEDIA_MIN_MB} MB.`)
      .max(KUOTA_MEDIA_MAX_MB, `Kuota media maksimal ${KUOTA_MEDIA_MAX_MB} MB.`)
      .nullable(),
  ),
});

export type DesaBaruInput = z.infer<typeof desaBaruSchema>;
