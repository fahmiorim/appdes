import { validationError } from "@/lib/errors";

/** Satu pilihan menu tingkat atas yang dapat diurutkan pengguna. */
export interface PilihanMenuUrutan {
  slug: string;
  label: string;
}

const MAKS_SLUG = 100;

/**
 * Terapkan urutan tersimpan pada menu tingkat atas.
 *
 * Slug yang tidak ada lagi (menu dihapus atau izinnya dicabut) dilewati, lalu
 * menu yang belum tersimpan diletakkan di belakang dengan urutan aslinya. Fungsi
 * murni tanpa I/O agar mudah diuji.
 */
export function susunMenuPersonal<T extends { slug: string }>(
  menu: readonly T[],
  urutan: readonly string[],
): T[] {
  const peta = new Map(menu.map((item) => [item.slug, item]));
  const hasil: T[] = [];
  const dipakai = new Set<string>();

  for (const slug of urutan) {
    const item = peta.get(slug);
    if (!item || dipakai.has(slug)) continue;
    hasil.push(item);
    dipakai.add(slug);
  }

  for (const item of menu) {
    if (dipakai.has(item.slug)) continue;
    hasil.push(item);
  }

  return hasil;
}

/**
 * Saring urutan data lama: buang slug kosong/duplikat dan menu yang tidak lagi
 * tersedia. Dipakai saat menampilkan preferensi yang tersimpan.
 */
export function normalisasiUrutanMenu<T extends { slug: string }>(
  menu: readonly T[],
  urutan: readonly string[],
): string[] {
  const diizinkan = new Set(menu.map((item) => item.slug));
  const hasil: string[] = [];

  for (const mentah of urutan) {
    const slug = mentah.trim();
    if (!slug || hasil.includes(slug) || !diizinkan.has(slug)) continue;
    hasil.push(slug);
  }

  return hasil;
}

/**
 * Validasi input pengguna sebelum disimpan. Daftar kosong berarti kembali ke
 * urutan bawaan; setiap slug wajib ada pada menu yang boleh dibaca akun.
 */
export function validasiUrutanMenu<T extends { slug: string }>(
  menu: readonly T[],
  urutan: readonly string[],
): string[] {
  const diizinkan = new Set(menu.map((item) => item.slug));
  const hasil: string[] = [];

  for (const mentah of urutan) {
    const slug = mentah.trim();
    if (!slug || slug.length > MAKS_SLUG) {
      throw validationError("Slug menu tidak valid.");
    }
    if (!diizinkan.has(slug)) {
      throw validationError(`Menu "${slug}" tidak tersedia untuk akun ini.`);
    }
    if (!hasil.includes(slug)) hasil.push(slug);
  }

  return hasil;
}
