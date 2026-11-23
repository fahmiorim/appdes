import { describe, expect, it } from "vitest";

import { keamananSchema, validasiKataSandi } from "./keamanan";

describe("kebijakan keamanan desa", () => {
  const policy = {
    passwordMinLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: true,
  };
  it("menolak password yang tidak memenuhi panjang minimum", () => {
    expect(validasiKataSandi("Abc123!", policy)).toContain("minimal 10");
  });
  it("menolak password tanpa kelas karakter wajib", () => {
    expect(validasiKataSandi("abcdefghij1!", policy)).toContain("huruf besar");
    expect(validasiKataSandi("Abcdefghij!", policy)).toContain("angka");
    expect(validasiKataSandi("Abcdefghij1", policy)).toContain("simbol");
  });
  it("menerima password yang memenuhi seluruh aturan", () => {
    expect(validasiKataSandi("Abcdefgh1!", policy)).toBeNull();
  });
  it("menolak whitelist IP yang tidak valid", () => {
    const result = keamananSchema.safeParse({
      passwordMinLength: 8,
      passwordExpiryDays: 90,
      passwordReuseCount: 3,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSymbol: false,
      sessionTimeoutMinutes: 30,
      autoLogoutInactive: true,
      concurrentLogin: false,
      requireTwoFactorForAllUsers: false,
      ipRestrictionEnabled: true,
      allowedIps: ["999.2.3.4"],
    });
    expect(result.success).toBe(false);
  });
});
