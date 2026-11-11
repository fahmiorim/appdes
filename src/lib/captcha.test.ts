import { describe, expect, it } from "vitest";

import { buatCaptcha, MASA_BERLAKU_CAPTCHA_MS, periksaCaptcha } from "./captcha";

const SECRET = "rahasia-uji-captcha-minimal-32-karakter";

/** Hitung jawaban dari teks pertanyaan yang dibuat captcha. */
function jawabanDari(pertanyaan: string): string {
  const ekspresi = pertanyaan.replace("Berapa ", "").replace("?", "");
  const [kiri, kanan] = ekspresi.split(/ [+−] /);
  if (kiri === undefined || kanan === undefined) throw new Error("Format pertanyaan tak dikenal");
  const a = Number(kiri);
  const b = Number(kanan);
  return String(ekspresi.includes("+") ? a + b : a - b);
}

describe("captcha pendaftaran", () => {
  it("menerima jawaban yang benar", () => {
    const sekarang = Date.now();
    const captcha = buatCaptcha(SECRET, sekarang);

    expect(captcha.pertanyaan).toContain("Berapa");
    expect(captcha.token).toContain(".");
    expect(
      periksaCaptcha(SECRET, jawabanDari(captcha.pertanyaan), captcha.token, sekarang + 1000),
    ).toBe(true);
  });

  it("menolak jawaban yang salah dan jawaban kosong", () => {
    const captcha = buatCaptcha(SECRET);
    const benar = Number(jawabanDari(captcha.pertanyaan));

    expect(periksaCaptcha(SECRET, String(benar + 1), captcha.token)).toBe(false);
    expect(periksaCaptcha(SECRET, "", captcha.token)).toBe(false);
  });

  it("menolak token yang dipalsukan atau diubah", () => {
    const captcha = buatCaptcha(SECRET);
    const jawaban = jawabanDari(captcha.pertanyaan);
    const [mentah, tanda] = captcha.token.split(".");

    expect(periksaCaptcha(SECRET, jawaban, `${mentah}.${tanda}x`)).toBe(false);
    expect(periksaCaptcha(SECRET, jawaban, `${mentah}x.${tanda}`)).toBe(false);
    expect(periksaCaptcha("secret-lain-yang-juga-panjang-32-kar!", jawaban, captcha.token)).toBe(
      false,
    );
  });

  it("menolak token kedaluwarsa", () => {
    const sekarang = Date.now();
    const captcha = buatCaptcha(SECRET, sekarang);

    expect(
      periksaCaptcha(
        SECRET,
        jawabanDari(captcha.pertanyaan),
        captcha.token,
        sekarang + MASA_BERLAKU_CAPTCHA_MS + 1,
      ),
    ).toBe(false);
  });

  it("menolak token rusak tanpa melempar galat", () => {
    expect(periksaCaptcha(SECRET, "3", "")).toBe(false);
    expect(periksaCaptcha(SECRET, "3", "bukan-token")).toBe(false);
    expect(periksaCaptcha(SECRET, "3", "a.b")).toBe(false);
  });
});
