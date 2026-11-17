import { randomInt } from "node:crypto";

/**
 * Sandi sementara untuk reset akses.
 *
 * Karakter yang mudah tertukar (`0/O`, `1/l/I`) sengaja tidak dipakai karena
 * sandi ini dibacakan atau disalin manual oleh operator. Fungsi murni selain
 * sumber acak kriptografis, sehingga kebijakan panjangnya satu tempat.
 */
const HURUF_SANDI = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export const PANJANG_SANDI_SEMENTARA = 12;

export function buatSandiSementara(panjang = PANJANG_SANDI_SEMENTARA): string {
  let sandi = "";
  for (let i = 0; i < panjang; i += 1) {
    sandi += HURUF_SANDI[randomInt(0, HURUF_SANDI.length)];
  }
  return sandi;
}
