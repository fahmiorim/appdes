import { z } from "zod";

import { validationError } from "@/lib/errors";

/** Batas pintasan beranda per pengguna. */
export const MAKS_SHORTCUT = 6;

const hrefsSchema = z
  .array(z.string().trim().min(1).max(255))
  .max(MAKS_SHORTCUT, `Maksimal ${MAKS_SHORTCUT} shortcut.`);

/**
 * Saring daftar href: buang kosong/duplikat, hanya yang boleh diakses, dan
 * potong sesuai batas. Dipakai saat menampilkan data lama yang mungkin sudah
 * kehilangan izin.
 */
export function normalisasiShortcut(
  hrefs: readonly string[],
  diizinkan: ReadonlySet<string>,
): string[] {
  const hasil: string[] = [];

  for (const href of hrefs) {
    const bersih = href.trim();
    if (!bersih || hasil.includes(bersih) || !diizinkan.has(bersih)) continue;
    hasil.push(bersih);
    if (hasil.length === MAKS_SHORTCUT) break;
  }

  return hasil;
}

/**
 * Validasi input pengguna: bentuk, batas, dan setiap tujuan harus ada pada menu
 * yang boleh dibaca akun tersebut. Melempar `validationError` bila tidak.
 */
export function validasiShortcut(
  hrefs: readonly string[],
  diizinkan: ReadonlySet<string>,
): string[] {
  const parsed = hrefsSchema.safeParse(hrefs);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Shortcut tidak valid.");
  }

  for (const href of parsed.data) {
    if (!diizinkan.has(href)) {
      throw validationError(`Menu "${href}" tidak tersedia untuk akun ini.`);
    }
  }

  return [...new Set(parsed.data)];
}
