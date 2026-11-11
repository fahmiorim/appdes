import { z } from "zod";

import {
  KUOTA_MEDIA_MAX_MB,
  KUOTA_MEDIA_MIN_MB,
  normalisasiDomain,
  POLA_DOMAIN,
} from "./desa-baru";

/**
 * Validasi pengelolaan desa oleh super admin.
 *
 * Aturan diletakkan di domain agar berlaku sama dari Server Action, halaman,
 * maupun pemanggil lain — pola yang sama dengan `desaBaruSchema`.
 */

/** Domain alias desa: dinormalisasi lalu wajib berupa hostname. */
export const domainDesaSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Domain wajib diisi.")
    .max(255, "Domain maksimal 255 karakter.")
    .transform(normalisasiDomain)
    .refine(
      (domain): domain is string => domain !== null && POLA_DOMAIN.test(domain),
      "Format domain tidak valid (contoh: desa-sukamaju.id).",
    ),
});

export type DomainDesaInput = z.infer<typeof domainDesaSchema>;

/** Kuota media desa; kosong berarti tanpa batas (`null`). */
export const kuotaMediaSchema = z.object({
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

export type KuotaMediaInput = z.infer<typeof kuotaMediaSchema>;

/** Status operasional desa. */
export const statusDesaSchema = z.object({
  active: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "1" || value === "on"),
});
