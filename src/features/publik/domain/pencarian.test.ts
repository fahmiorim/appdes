import { describe, expect, it } from "vitest";

import { MAKS_PANJANG_PENCARIAN, normalisasiKataKunci, polaLike } from "./pencarian";

describe("normalisasiKataKunci", () => {
  it("mengembalikan string kosong untuk nilai bukan teks", () => {
    expect(normalisasiKataKunci(undefined)).toBe("");
    expect(normalisasiKataKunci(null)).toBe("");
    expect(normalisasiKataKunci(42)).toBe("");
    expect(normalisasiKataKunci({ q: "x" })).toBe("");
  });

  it("merapikan spasi berlebih dan spasi tepi", () => {
    expect(normalisasiKataKunci("  berita   desa  ")).toBe("berita desa");
  });

  it("membatasi panjang kata kunci", () => {
    expect(normalisasiKataKunci("a".repeat(150))).toHaveLength(MAKS_PANJANG_PENCARIAN);
    expect(normalisasiKataKunci("abcdef", 3)).toBe("abc");
  });
});

describe("polaLike", () => {
  it("membungkus kata kunci dengan wildcard", () => {
    expect(polaLike("galeri")).toBe("%galeri%");
  });

  it("meng-escape wildcard agar dicari sebagai teks literal", () => {
    expect(polaLike("100%")).toBe("%100\\%%");
    expect(polaLike("a_b")).toBe("%a\\_b%");
    expect(polaLike("a\\b")).toBe("%a\\\\b%");
  });
});
