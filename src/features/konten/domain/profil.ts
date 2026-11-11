import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";
import { optionalText } from "@/lib/forms";

/**
 * Profil desa.
 *
 * Satu baris per desa. `visi` dan `misi` adalah teks biasa (misi satu butir per
 * baris), sedangkan `sejarah` dan `sambutan` boleh berisi HTML yang disanitasi
 * di application layer sebelum disimpan.
 */

export const PROFIL_DESA_RESOURCE = RESOURCES.profilDesa;

/** Pola koordinat sederhana: `lintang, bujur` (mis. `-6.2, 106.816666`). */
const POLA_KOORDINAT = /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;

export const profilDesaFormSchema = z.object({
  visi: optionalText(2000),
  misi: optionalText(5000),
  sejarah: optionalText(20_000),
  sambutan: optionalText(10_000),
  koordinat: z
    .string()
    .trim()
    .max(60, "Maksimal 60 karakter.")
    .refine(
      (value) => value === "" || POLA_KOORDINAT.test(value),
      "Format koordinat: lintang, bujur (mis. -6.2, 106.816666).",
    )
    .default(""),
});

export type ProfilDesaFormInput = z.infer<typeof profilDesaFormSchema>;

/** Data profil yang ditampilkan pada form admin. */
export interface ProfilDesaAdmin {
  visi: string;
  misi: string;
  sejarah: string;
  sambutan: string;
  koordinat: string;
}
