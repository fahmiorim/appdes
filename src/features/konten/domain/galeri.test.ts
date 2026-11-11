import { describe, expect, it } from "vitest";

import { albumFormSchema, fotoFormSchema, slugAlbum } from "./galeri";

describe("albumFormSchema", () => {
  it("menerima album valid dan mengubah urutan menjadi angka", () => {
    const hasil = albumFormSchema.safeParse({
      nama: "Kegiatan Desa",
      keterangan: "",
      urut: "2",
      aktif: true,
    });

    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.urut).toBe(2);
  });

  it("menolak nama kosong dan urutan di luar batas", () => {
    expect(albumFormSchema.safeParse({ nama: " ", urut: "0", aktif: true }).success).toBe(false);
    expect(albumFormSchema.safeParse({ nama: "A", urut: "1000", aktif: true }).success).toBe(false);
  });
});

describe("fotoFormSchema", () => {
  it("memberi nilai awal yang aman", () => {
    const hasil = fotoFormSchema.safeParse({
      judul: "",
      keterangan: "",
      urut: "0",
      aktif: true,
      slider: false,
    });

    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.judul).toBe("");
      expect(hasil.data.slider).toBe(false);
    }
  });

  it("menolak judul melebihi 150 karakter", () => {
    const hasil = fotoFormSchema.safeParse({
      judul: "x".repeat(151),
      urut: "0",
      aktif: true,
      slider: false,
    });

    expect(hasil.success).toBe(false);
  });
});

describe("slugAlbum", () => {
  it("membentuk slug aman dan melucuti diakritik", () => {
    expect(slugAlbum("Galeri Posyandu — 2027")).toBe("galeri-posyandu-2027");
    expect(slugAlbum("Café Desa")).toBe("cafe-desa");
  });

  it("memberi awalan album bila nama tidak menyisakan karakter sah", () => {
    expect(slugAlbum("!!!")).toBe("album");
  });

  it("menyisakan ruang akhiran unik agar slug album tetap muat kolom 150", () => {
    const dasar = slugAlbum("a".repeat(200));

    expect(dasar.length).toBeLessThanOrEqual(146);
    expect(`${dasar}-200`.length).toBeLessThanOrEqual(150);
  });
});
