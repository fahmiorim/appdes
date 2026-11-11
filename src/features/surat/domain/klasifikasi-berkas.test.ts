import { describe, expect, it } from "vitest";

import { siapkanBarisKlasifikasi, templateImporKlasifikasi } from "./klasifikasi-berkas";

describe("siapkanBarisKlasifikasi", () => {
  it("menormalisasi kode ke huruf besar dan memangkas spasi", () => {
    const hasil = siapkanBarisKlasifikasi([
      { nomorBaris: 1, kode: " sk ", nama: " Surat Keterangan ", keterangan: " lama " },
    ]);

    expect(hasil.galat).toEqual([]);
    expect(hasil.rows[0]).toEqual({
      kode: "SK",
      nama: "Surat Keterangan",
      keterangan: "lama",
    });
  });

  it("menolak kode/nama kosong dan kode terlalu panjang", () => {
    const hasil = siapkanBarisKlasifikasi([
      { nomorBaris: 1, kode: "", nama: "Tanpa kode" },
      { nomorBaris: 2, kode: "SK", nama: "  " },
      { nomorBaris: 3, kode: "X".repeat(21), nama: "Terlalu panjang" },
    ]);

    expect(hasil.rows).toEqual([]);
    expect(hasil.galat.map((item) => item.baris)).toEqual([1, 2, 3]);
  });

  it("menolak kode duplikat dan menyebut baris pertama", () => {
    const hasil = siapkanBarisKlasifikasi([
      { nomorBaris: 1, kode: "sk", nama: "Pertama" },
      { nomorBaris: 2, kode: "SK", nama: "Kedua" },
    ]);

    expect(hasil.rows).toHaveLength(1);
    expect(hasil.galat[0]?.pesan).toContain("duplikat");
    expect(hasil.galat[0]?.pesan).toContain("baris 1");
  });

  it("keterangan kosong menjadi null dan dibatasi 500 karakter", () => {
    const hasil = siapkanBarisKlasifikasi([
      { nomorBaris: 1, kode: "A", nama: "A", keterangan: "" },
      { nomorBaris: 2, kode: "B", nama: "B", keterangan: "x".repeat(700) },
    ]);

    expect(hasil.rows[0]?.keterangan).toBeNull();
    expect(hasil.rows[1]?.keterangan).toHaveLength(500);
  });
});

describe("templateImporKlasifikasi", () => {
  it("memuat header dan contoh kode", () => {
    const csv = templateImporKlasifikasi();

    expect(csv).toContain("Kode,Nama,Keterangan");
    expect(csv).toContain("SK,Surat Keterangan");
  });
});
