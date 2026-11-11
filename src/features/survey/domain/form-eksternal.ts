import { createHmac, timingSafeEqual } from "node:crypto";

/** Masa berlaku bawaan token formulir eksternal (7 hari). */
export const MASA_TOKEN_FORM_EKSTERNAL_MS = 7 * 24 * 60 * 60 * 1000;

function tandaTangan(secret: string, surveyId: number, kedaluwarsa: number): string {
  return createHmac("sha256", secret).update(`${surveyId}.${kedaluwarsa}`).digest("base64url");
}

function samaAman(a: string, b: string): boolean {
  const kiri = Buffer.from(a);
  const kanan = Buffer.from(b);
  return kiri.length === kanan.length && timingSafeEqual(kiri, kanan);
}

/**
 * Buat token formulir eksternal untuk satu survei.
 * Token tidak memuat data pribadi: hanya id survei + waktu kedaluwarsa + HMAC.
 */
export function buatTokenFormEksternal(
  secret: string,
  surveyId: number,
  sekarang = Date.now(),
  masaMs = MASA_TOKEN_FORM_EKSTERNAL_MS,
): string {
  const kedaluwarsa = sekarang + masaMs;
  return `${kedaluwarsa}.${tandaTangan(secret, surveyId, kedaluwarsa)}`;
}

export type HasilVerifikasiTokenForm = "valid" | "kedaluwarsa" | "tidak-valid";

/** Periksa token formulir eksternal terhadap survei yang dituju. */
export function verifikasiTokenFormEksternal(
  secret: string,
  token: string,
  surveyId: number,
  sekarang = Date.now(),
): HasilVerifikasiTokenForm {
  const [kedaluwarsaRaw, signature, ...sisa] = token.split(".");
  if (!kedaluwarsaRaw || !signature || sisa.length > 0) return "tidak-valid";
  if (!/^\d{1,16}$/.test(kedaluwarsaRaw)) return "tidak-valid";

  const kedaluwarsa = Number(kedaluwarsaRaw);
  if (!samaAman(signature, tandaTangan(secret, surveyId, kedaluwarsa))) {
    return "tidak-valid";
  }
  if (kedaluwarsa < sekarang) return "kedaluwarsa";
  return "valid";
}
