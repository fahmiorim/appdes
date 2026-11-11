import { describe, expect, it } from "vitest";

import { normalisasiNomorHp, verifikasiKontakSchema } from "./verifikasi-kontak";

describe("verifikasiKontakSchema", () => {
  it("menormalkan nomor HP lokal ke format 62", () => {
    const hasil = verifikasiKontakSchema.parse({ target: "0812-3456-7890" });
    expect(hasil.target).toEqual({ target: "6281234567890", kanal: "whatsapp" });
  });

  it("menerima email dan memilih kanal email", () => {
    const hasil = verifikasiKontakSchema.parse({ target: " Warga@Desa.ID " });
    expect(hasil.target).toEqual({ target: "warga@desa.id", kanal: "email" });
  });

  it("menolak email tidak valid", () => {
    expect(verifikasiKontakSchema.safeParse({ target: "bukan@email" }).success).toBe(false);
  });

  it("menolak nomor HP tidak valid", () => {
    expect(verifikasiKontakSchema.safeParse({ target: "12345" }).success).toBe(false);
  });
});

describe("normalisasiNomorHp", () => {
  it("mempertahankan awalan 62 dan membuang non-digit", () => {
    expect(normalisasiNomorHp("+62 812 3456 7890")).toBe("6281234567890");
  });
});
