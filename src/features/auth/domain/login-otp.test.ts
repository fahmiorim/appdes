import { describe, expect, it } from "vitest";

import { hashKodeOtp, MAKS_PERCOBAAN_OTP, periksaKodeOtp, type KodeOtpAktif } from "./login-otp";

const kode = "123456";

function aktif(overrides: Partial<KodeOtpAktif> = {}): KodeOtpAktif {
  return {
    kodeHash: hashKodeOtp(kode),
    kedaluwarsa: new Date(Date.now() + 60_000),
    percobaan: 0,
    terpakaiAt: null,
    ...overrides,
  };
}

describe("periksaKodeOtp", () => {
  it("menerima kode yang cocok dan belum kedaluwarsa", () => {
    expect(periksaKodeOtp(aktif(), kode)).toBeNull();
    expect(periksaKodeOtp(aktif(), " 123456 ")).toBeNull();
  });

  it("menolak kode salah dan format bukan enam digit", () => {
    expect(periksaKodeOtp(aktif(), "654321")).toBe("Kode OTP salah.");
    expect(periksaKodeOtp(aktif(), "12ab56")).toContain("6 digit");
    expect(periksaKodeOtp(aktif(), "12345")).toContain("6 digit");
  });

  it("menolak kode kedaluwarsa, terpakai, atau melewati batas percobaan", () => {
    expect(periksaKodeOtp(aktif({ kedaluwarsa: new Date(Date.now() - 1000) }), kode)).toContain(
      "kedaluwarsa",
    );

    expect(periksaKodeOtp(aktif({ terpakaiAt: new Date() }), kode)).toContain("sudah dipakai");

    expect(periksaKodeOtp(aktif({ percobaan: MAKS_PERCOBAAN_OTP }), kode)).toContain(
      "Terlalu banyak",
    );
  });
});
