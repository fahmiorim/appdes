import { describe, expect, it } from "vitest";

import { buatSlug, PANJANG_SLUG_MAKS, slugUnik } from "./slug";

describe("buatSlug", () => {
  it("mengubah judul menjadi huruf kecil bertanda hubung", () => {
    expect(buatSlug("Gotong Royong Bersih Desa")).toBe("gotong-royong-bersih-desa");
  });

  it("melucuti diakritik", () => {
    expect(buatSlug("Pelatihan Krém Décor")).toBe("pelatihan-krem-decor");
  });

  it("memadatkan pemisah beruntun dan memangkas ujung", () => {
    expect(buatSlug("  --Harga   Beras---Naik!! ")).toBe("harga-beras-naik");
  });

  it("menghasilkan string kosong untuk teks tanpa huruf/angka", () => {
    expect(buatSlug("!!! ??? ---")).toBe("");
  });

  it("membatasi panjang slug", () => {
    const hasil = buatSlug("a".repeat(400));
    expect(hasil.length).toBe(PANJANG_SLUG_MAKS);
  });
});

describe("slugUnik", () => {
  it("mengembalikan slug dasar bila belum dipakai", () => {
    expect(slugUnik("berita-baru", () => false)).toBe("berita-baru");
  });

  it("menambahkan akhiran angka bila sudah dipakai", () => {
    const dipakai = new Set(["berita-baru", "berita-baru-2"]);
    expect(slugUnik("berita-baru", (k) => dipakai.has(k))).toBe("berita-baru-3");
  });

  it("memakai 'konten' bila slug dasar kosong", () => {
    expect(slugUnik("", () => false)).toBe("konten");
  });
});
