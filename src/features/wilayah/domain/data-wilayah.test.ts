import { describe, expect, it } from "vitest";

import { indukValid, isTingkatWilayah, keWilayah } from "./data-wilayah";

describe("isTingkatWilayah", () => {
  it("menerima tingkat yang dikenal", () => {
    expect(isTingkatWilayah("provinsi")).toBe(true);
    expect(isTingkatWilayah("desa")).toBe(true);
  });

  it("menolak tingkat lain dan nilai kosong", () => {
    expect(isTingkatWilayah("kabupaten/kota")).toBe(false);
    expect(isTingkatWilayah(null)).toBe(false);
  });
});

describe("indukValid", () => {
  it("provinsi tidak memerlukan induk", () => {
    expect(indukValid("provinsi", null)).toBe(true);
  });

  it("memeriksa panjang kode induk tiap tingkat", () => {
    expect(indukValid("kabupaten", "11")).toBe(true);
    expect(indukValid("kecamatan", "11.01")).toBe(true);
    expect(indukValid("desa", "11.01.01")).toBe(true);
  });

  it("menolak induk yang salah format atau hilang", () => {
    expect(indukValid("kabupaten", "11.01")).toBe(false);
    expect(indukValid("kecamatan", null)).toBe(false);
    expect(indukValid("desa", "11.01.01.2001")).toBe(false);
  });
});

describe("keWilayah", () => {
  it("memetakan baris dataset menjadi objek wilayah", () => {
    expect(keWilayah([["11", "Aceh"]])).toEqual([{ kode: "11", nama: "Aceh" }]);
  });

  it("mengembalikan daftar kosong untuk induk tak dikenal", () => {
    expect(keWilayah(undefined)).toEqual([]);
  });
});
