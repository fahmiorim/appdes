import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

const SECRET = "a".repeat(32);

describe("parseEnv", () => {
  it("menerima konfigurasi minimal dan mengisi nilai bawaan", () => {
    const env = parseEnv({
      DATABASE_URL: "mysql://root:@127.0.0.1:3306/desa_dev",
      BETTER_AUTH_SECRET: SECRET,
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("menolak DATABASE_URL yang kosong", () => {
    expect(() => parseEnv({ DATABASE_URL: "", BETTER_AUTH_SECRET: SECRET })).toThrow(
      /Konfigurasi environment tidak valid/,
    );
  });

  it("menolak BETTER_AUTH_SECRET yang terlalu pendek", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://x", BETTER_AUTH_SECRET: "pendek" })).toThrow(
      /Konfigurasi environment tidak valid/,
    );
  });

  it("menolak API key Resend tanpa sender terverifikasi", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mysql://x",
        BETTER_AUTH_SECRET: SECRET,
        RESEND_API_KEY: "re_test_key",
      }),
    ).toThrow(/RESEND_FROM/);
  });

  it("menerima sender Resend saat email diaktifkan", () => {
    const env = parseEnv({
      DATABASE_URL: "mysql://x",
      BETTER_AUTH_SECRET: SECRET,
      RESEND_API_KEY: "re_test_key",
      RESEND_FROM: "SID Desa <notifikasi@example.test>",
    });

    expect(env.RESEND_FROM).toBe("SID Desa <notifikasi@example.test>");
  });
  it("menolak token webhook email yang terlalu pendek", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mysql://x",
        BETTER_AUTH_SECRET: SECRET,
        EMAIL_WEBHOOK_TOKEN: "pendek",
      }),
    ).toThrow(/EMAIL_WEBHOOK_TOKEN minimal 32 karakter/);
  });

  it("fallback satu desa mati secara default dan hanya aktif bila diminta", () => {
    const dasar = { DATABASE_URL: "mysql://x", BETTER_AUTH_SECRET: SECRET };

    expect(parseEnv(dasar).TENANT_LEGACY_SINGLE_HOST_FALLBACK).toBe(false);
    expect(
      parseEnv({ ...dasar, TENANT_LEGACY_SINGLE_HOST_FALLBACK: "true" })
        .TENANT_LEGACY_SINGLE_HOST_FALLBACK,
    ).toBe(true);
    expect(() => parseEnv({ ...dasar, TENANT_LEGACY_SINGLE_HOST_FALLBACK: "1" })).toThrow(
      /Konfigurasi environment tidak valid/,
    );
  });

  it("menolak fallback aktif pada production FlexiDesa", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        APP_URL: "https://flexidesa.id",
        DATABASE_URL: "mysql://x",
        BETTER_AUTH_SECRET: SECRET,
        TENANT_LEGACY_SINGLE_HOST_FALLBACK: "true",
      }),
    ).toThrow(/TENANT_LEGACY_SINGLE_HOST_FALLBACK tidak boleh aktif pada production FlexiDesa/);
  });

  it("menolak fallback aktif bila PLATFORM_HOSTS memuat host FlexiDesa", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        APP_URL: "https://sid.example.go.id",
        PLATFORM_HOSTS: "flexidesa.id, app.example.test",
        DATABASE_URL: "mysql://x",
        BETTER_AUTH_SECRET: SECRET,
        TENANT_LEGACY_SINGLE_HOST_FALLBACK: "true",
      }),
    ).toThrow(/TENANT_LEGACY_SINGLE_HOST_FALLBACK tidak boleh aktif pada production FlexiDesa/);
  });

  it("tetap mengizinkan fallback di development dan production mandiri", () => {
    const dasar = {
      DATABASE_URL: "mysql://x",
      BETTER_AUTH_SECRET: SECRET,
      TENANT_LEGACY_SINGLE_HOST_FALLBACK: "true",
    };

    expect(parseEnv(dasar).TENANT_LEGACY_SINGLE_HOST_FALLBACK).toBe(true);
    expect(
      parseEnv({ ...dasar, NODE_ENV: "production", APP_URL: "https://sid.example.go.id" })
        .TENANT_LEGACY_SINGLE_HOST_FALLBACK,
    ).toBe(true);
  });

  it("menerima token webhook email yang kuat", () => {
    const env = parseEnv({
      DATABASE_URL: "mysql://x",
      BETTER_AUTH_SECRET: SECRET,
      EMAIL_WEBHOOK_TOKEN: "w".repeat(32),
    });

    expect(env.EMAIL_WEBHOOK_TOKEN).toBe("w".repeat(32));
  });
});
