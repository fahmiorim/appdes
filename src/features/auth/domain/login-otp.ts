import { createHash, randomInt } from "node:crypto";

/** Panjang kode OTP login. */
export const PANJANG_OTP = 6;
/** Masa berlaku kode OTP login. */
export const MASA_BERLAKU_OTP_MS = 10 * 60 * 1000;
/** Batas percobaan salah sebelum kode dianggap hangus. */
export const MAKS_PERCOBAAN_OTP = 5;

/** Format kode OTP yang diterima (tepat `PANJANG_OTP` digit angka). */
export const POLA_KODE_OTP = new RegExp(`^\\d{${PANJANG_OTP}}$`);

export function hashKodeOtp(kode: string): string {
  return createHash("sha256").update(kode).digest("hex");
}

export function buatKodeOtp(): string {
  return String(randomInt(0, 10 ** PANJANG_OTP)).padStart(PANJANG_OTP, "0");
}

export interface KodeOtpAktif {
  kodeHash: string;
  kedaluwarsa: Date;
  percobaan: number;
  terpakaiAt: Date | null;
}

/**
 * Periksa kode OTP; mengembalikan pesan kesalahan atau `null` bila sah.
 *
 * Kode yang sudah terpakai, kedaluwarsa, atau melewati batas percobaan tidak
 * dapat dipakai lagi.
 */
export function periksaKodeOtp(
  kode: KodeOtpAktif,
  masukan: string,
  sekarang: Date = new Date(),
): string | null {
  if (kode.terpakaiAt) return "Kode OTP sudah dipakai. Minta kode baru.";
  if (kode.kedaluwarsa.getTime() < sekarang.getTime()) {
    return "Kode OTP sudah kedaluwarsa. Minta kode baru.";
  }
  if (kode.percobaan >= MAKS_PERCOBAAN_OTP) {
    return "Terlalu banyak percobaan. Minta kode baru.";
  }

  const bersih = masukan.trim();
  if (!POLA_KODE_OTP.test(bersih)) {
    return `Kode OTP harus ${PANJANG_OTP} digit angka.`;
  }
  if (hashKodeOtp(bersih) !== kode.kodeHash) return "Kode OTP salah.";

  return null;
}
