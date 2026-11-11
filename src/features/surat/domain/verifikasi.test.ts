import { describe, expect, it } from "vitest";

import { buildVerificationUrl, validateVerification } from "./verifikasi";

describe("buildVerificationUrl", () => {
  it("menyusun tautan verifikasi dari origin & token", () => {
    expect(buildVerificationUrl("https://desa-sukamaju.id", "abc123")).toBe(
      "https://desa-sukamaju.id/desa/verifikasi-surat/abc123",
    );
  });

  it("menghapus garis miring berlebih di akhir origin", () => {
    expect(buildVerificationUrl("https://desa.id///", "abc")).toBe(
      "https://desa.id/desa/verifikasi-surat/abc",
    );
  });

  it("memangkas spasi dan meng-encode token", () => {
    expect(buildVerificationUrl(" http://localhost:3000 ", "  a b/c  ")).toBe(
      "http://localhost:3000/desa/verifikasi-surat/a%20b%2Fc",
    );
  });
});

describe("validateVerification", () => {
  const dasar = {
    id: 1,
    status: "verifikasi" as const,
    verifikasiOperator: true,
    verifikasiSekdes: true,
    verifikasiKades: null,
  };

  it("menolak pembuat menyetujui tahap kades", () => {
    const hasil = validateVerification(
      "kepala-desa",
      "kades-1",
      { ...dasar, createdBy: "kades-1" },
      "kades",
    );

    expect(hasil).toMatchObject({ ok: false, errorCode: "own-submission" });
    expect(hasil.error).toBe("Anda tidak boleh memverifikasi surat yang Anda buat sendiri.");
  });

  it("mengizinkan operator memeriksa konsep yang ia susun", () => {
    const hasil = validateVerification(
      "operator",
      "operator-1",
      { ...dasar, verifikasiOperator: null, verifikasiSekdes: null, createdBy: "operator-1" },
      "operator",
    );

    expect(hasil).toEqual({ ok: true });
  });

  it("menolak role yang tidak berwenang pada tahap ini", () => {
    const hasil = validateVerification(
      "sekretaris-desa",
      "sekdes-1",
      { ...dasar, verifikasiOperator: null, verifikasiSekdes: null, createdBy: null },
      "operator",
    );

    expect(hasil).toMatchObject({ ok: false, errorCode: "wrong-role" });
  });

  it("menolak lompat tahap walau superadmin", () => {
    const hasil = validateVerification(
      "kepala-desa",
      "admin-1",
      { ...dasar, verifikasiOperator: null, verifikasiSekdes: null, createdBy: null },
      "kades",
      true,
    );

    expect(hasil).toMatchObject({ ok: false, errorCode: "skip-step" });
  });
});
