import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Captcha aritmetika stateless untuk formulir publik.
 *
 * Pertanyaan dibuat di server dan jawabannya ditandatangani HMAC, sehingga
 * tidak perlu disimpan di sesi atau database. Token kedaluwarsa setelah 10
 * menit dan tanda tangan mencegah jawaban dipalsukan. Karena stateless, token
 * yang sama masih dapat dipakai ulang sampai kedaluwarsa; honeypot dan audit
 * melengkapi lapisan anti-abuse ini.
 */
export const MASA_BERLAKU_CAPTCHA_MS = 10 * 60 * 1000;

export interface CaptchaChallenge {
  pertanyaan: string;
  token: string;
}

interface IsiCaptcha {
  jawaban: number;
  kedaluwarsa: number;
  nonce: string;
}

function tandaTangan(secret: string, isi: string): string {
  return createHmac("sha256", secret).update(isi).digest("base64url");
}

function samaPersis(kiri: string, kanan: string): boolean {
  const a = Buffer.from(kiri, "utf8");
  const b = Buffer.from(kanan, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Buat pertanyaan + token bertanda tangan. */
export function buatCaptcha(secret: string, sekarang: number = Date.now()): CaptchaChallenge {
  const a = randomInt(2, 10);
  const b = randomInt(2, 10);

  let kiri = a;
  let kanan = b;
  let jawaban = a + b;
  let operasi = "+";

  if (randomInt(0, 2) === 0) {
    // Kurangi angka yang lebih kecil agar hasilnya tidak negatif.
    kiri = Math.max(a, b);
    kanan = Math.min(a, b);
    jawaban = kiri - kanan;
    operasi = "−";
  }

  const isi: IsiCaptcha = {
    jawaban,
    kedaluwarsa: sekarang + MASA_BERLAKU_CAPTCHA_MS,
    nonce: randomInt(0, 2 ** 31 - 1).toString(36),
  };
  const mentah = Buffer.from(JSON.stringify(isi), "utf8").toString("base64url");

  return {
    pertanyaan: `Berapa ${kiri} ${operasi} ${kanan}?`,
    token: `${mentah}.${tandaTangan(secret, mentah)}`,
  };
}

/** Periksa jawaban terhadap token; salah, rusak, atau kedaluwarsa → `false`. */
export function periksaCaptcha(
  secret: string,
  jawaban: string,
  token: string,
  sekarang: number = Date.now(),
): boolean {
  try {
    const [mentah, tanda] = token.split(".");
    if (!mentah || !tanda) return false;
    if (!samaPersis(tanda, tandaTangan(secret, mentah))) return false;

    const isi = JSON.parse(
      Buffer.from(mentah, "base64url").toString("utf8"),
    ) as Partial<IsiCaptcha>;
    if (typeof isi.jawaban !== "number" || typeof isi.kedaluwarsa !== "number") return false;
    if (isi.kedaluwarsa < sekarang) return false;

    const dijawab = jawaban.trim();
    return dijawab !== "" && Number(dijawab) === isi.jawaban;
  } catch {
    return false;
  }
}
