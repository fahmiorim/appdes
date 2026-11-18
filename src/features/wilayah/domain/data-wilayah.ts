/**
 * Referensi wilayah administratif Indonesia (provinsi s.d. desa/kelurahan)
 * untuk picker pendaftaran desa.
 *
 * Sumber data: Kepmendagri No. 300.2.2-2138 Tahun 2025, dihasilkan oleh
 * `scripts/wilayah/generate-wilayah.mjs`. Semua fungsi di sini murni supaya
 * pemetaan data dapat diuji tanpa jaringan maupun database.
 */

/** Satu baris dataset: [kode wilayah, nama wilayah]. */
export type BarisWilayah = readonly [kode: string, nama: string];

export interface Wilayah {
  kode: string;
  nama: string;
}

export const TINGKAT_WILAYAH = ["provinsi", "kabupaten", "kecamatan", "desa"] as const;

export type TingkatWilayah = (typeof TINGKAT_WILAYAH)[number];

/**
 * Pola kode induk yang harus dikirim klien. `null` berarti tingkat teratas
 * (provinsi) tidak punya induk.
 */
export const POLA_INDUK: Record<TingkatWilayah, RegExp | null> = {
  provinsi: null,
  kabupaten: /^\d{2}$/,
  kecamatan: /^\d{2}\.\d{2}$/,
  desa: /^\d{2}\.\d{2}\.\d{2}$/,
};

export function isTingkatWilayah(nilai: string | null): nilai is TingkatWilayah {
  return nilai !== null && (TINGKAT_WILAYAH as readonly string[]).includes(nilai);
}

/** Apakah kode induk sesuai tingkat yang diminta (mencegah pencarian liar). */
export function indukValid(tingkat: TingkatWilayah, induk: string | null): boolean {
  const pola = POLA_INDUK[tingkat];
  if (pola === null) return true;
  return induk !== null && pola.test(induk);
}

/** Ubah baris dataset menjadi objek `{ kode, nama }` untuk JSON API. */
export function keWilayah(baris: readonly BarisWilayah[] | undefined): Wilayah[] {
  return (baris ?? []).map(([kode, nama]) => ({ kode, nama }));
}
