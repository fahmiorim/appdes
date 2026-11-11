/**
 * Normalisasi kata kunci pencarian publik.
 *
 * Input berasal dari query string sehingga harus diperlakukan sebagai data tak
 * tepercaya. Hanya panjang dan spasi yang dirapikan di sini; escaping wildcard
 * SQL dilakukan terpisah oleh `polaLike` agar pemisahan tanggung jawab jelas
 * dan mudah diuji tanpa basis data.
 */

/** Batas aman panjang kata kunci agar tidak membebani query `LIKE`. */
export const MAKS_PANJANG_PENCARIAN = 100;

/** Rapikan kata kunci: buang spasi tepi dan spasi berlebih, batasi panjang. */
export function normalisasiKataKunci(input: unknown, maks = MAKS_PANJANG_PENCARIAN): string {
  if (typeof input !== "string") return "";
  return input.replace(/\s+/g, " ").trim().slice(0, maks);
}

/**
 * Ubah kata kunci menjadi pola `LIKE` yang aman.
 *
 * `%` dan `_` adalah wildcard SQL; bila dibiarkan, warga bisa mengetik `%`
 * untuk mencocokkan seluruh isi tabel. Keduanya di-escape bersama karakter
 * escape `\` sehingga yang dicari benar-benar teks literal.
 */
export function polaLike(kata: string): string {
  const aman = kata.replace(/[\\%_]/g, (karakter) => `\\${karakter}`);
  return `%${aman}%`;
}
