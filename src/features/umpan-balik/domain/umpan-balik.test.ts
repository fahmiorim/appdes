import { describe, expect, it } from "vitest";

import {
  isUmpanBalikStatus,
  labelStatusUmpanBalik,
  ubahStatusUmpanBalikSchema,
  umpanBalikSchema,
} from "./umpan-balik";

describe("umpanBalikSchema", () => {
  it("menerima pesan dengan nama/kontak kosong (anonim)", () => {
    const hasil = umpanBalikSchema.parse({
      nama: "",
      kontak: "",
      pesan: "  Mohon tambah lampu jalan di RT 02.  ",
    });
    expect(hasil.pesan).toBe("Mohon tambah lampu jalan di RT 02.");
  });

  it("menolak pesan yang terlalu pendek", () => {
    const hasil = umpanBalikSchema.safeParse({ pesan: "halo" });
    expect(hasil.success).toBe(false);
  });

  it("menolak pesan yang terlalu panjang", () => {
    const hasil = umpanBalikSchema.safeParse({ pesan: "x".repeat(2001) });
    expect(hasil.success).toBe(false);
  });

  it("membatasi nama dan kontak", () => {
    expect(
      umpanBalikSchema.safeParse({ nama: "x".repeat(101), pesan: "a".repeat(10) }).success,
    ).toBe(false);
    expect(
      umpanBalikSchema.safeParse({ kontak: "x".repeat(151), pesan: "a".repeat(10) }).success,
    ).toBe(false);
  });
});

describe("status umpan balik", () => {
  it("mengenali status baku", () => {
    for (const status of ["baru", "dibaca", "ditindaklanjuti"] as const) {
      expect(isUmpanBalikStatus(status)).toBe(true);
      expect(labelStatusUmpanBalik(status)).not.toBe(status);
    }
  });

  it("mempertahankan nilai lama yang tidak dikenal", () => {
    expect(isUmpanBalikStatus("arsip")).toBe(false);
    expect(labelStatusUmpanBalik("arsip")).toBe("arsip");
  });
});

describe("ubahStatusUmpanBalikSchema", () => {
  it("mengubah id string menjadi angka", () => {
    expect(ubahStatusUmpanBalikSchema.parse({ id: "12", status: "dibaca" })).toEqual({
      id: 12,
      status: "dibaca",
    });
  });

  it("menolak status di luar daftar", () => {
    expect(ubahStatusUmpanBalikSchema.safeParse({ id: "1", status: "hapus" }).success).toBe(false);
  });
});
