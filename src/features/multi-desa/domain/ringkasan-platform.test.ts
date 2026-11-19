import { describe, expect, it } from "vitest";

import { distribusiKecamatan, distribusiTema } from "./ringkasan-platform";

describe("distribusiKecamatan", () => {
  it("mengurutkan kecamatan terbanyak dan menghitung persentase seluruh tenant", () => {
    const hasil = distribusiKecamatan([
      { district: "Cibadak" },
      { district: "Cibadak" },
      { district: "Sukaraja" },
      { district: null },
      { district: "  " },
    ]);

    expect(hasil.total).toBe(5);
    expect(hasil.tanpaKecamatan).toBe(2);
    expect(hasil.items).toEqual([
      { label: "Cibadak", value: 2, persentase: 40 },
      { label: "Sukaraja", value: 1, persentase: 20 },
    ]);
  });

  it("menggabungkan kecamatan di luar batas tampilan menjadi satu kelompok", () => {
    const hasil = distribusiKecamatan(
      [
        { district: "A" },
        { district: "B" },
        { district: "B" },
        { district: "C" },
        { district: "C" },
        { district: "D" },
      ],
      2,
    );

    expect(hasil.items).toEqual([
      { label: "B", value: 2, persentase: 33 },
      { label: "C", value: 2, persentase: 33 },
      { label: "Kecamatan lain", value: 2, persentase: 33 },
    ]);
  });

  it("mengembalikan hasil kosong untuk daftar kosong", () => {
    expect(distribusiKecamatan([])).toEqual({
      items: [],
      total: 0,
      tanpaKecamatan: 0,
    });
  });
});

describe("distribusiTema", () => {
  it("menghitung tenant bertema dan jumlah tema unik berdasarkan slug", () => {
    const hasil = distribusiTema([
      { tema: "tegar", temaNama: "Tegar" },
      { tema: "tegar", temaNama: "Tegar" },
      { tema: "asri", temaNama: "Asri" },
      { tema: null, temaNama: null },
    ]);

    expect(hasil.total).toBe(4);
    expect(hasil.bertema).toBe(3);
    expect(hasil.tanpaTema).toBe(1);
    expect(hasil.temaUnik).toBe(2);
    expect(hasil.items).toEqual([
      { label: "Tegar", value: 2, persentase: 50 },
      { label: "Asri", value: 1, persentase: 25 },
    ]);
  });

  it("tidak menggabungkan slug berbeda yang nama tampilannya sama", () => {
    const hasil = distribusiTema([
      { tema: "tegar", temaNama: "Tema Desa" },
      { tema: "asri", temaNama: "Tema Desa" },
    ]);

    expect(hasil.temaUnik).toBe(2);
    expect(hasil.items.map((item) => item.label)).toEqual(["Tema Desa", "Tema Desa"]);
  });

  it("membatasi jumlah kelompok dan menambahkan tema lain", () => {
    const hasil = distribusiTema(
      [
        { tema: "a", temaNama: "A" },
        { tema: "b", temaNama: "B" },
        { tema: "c", temaNama: "C" },
        { tema: "c", temaNama: "C" },
      ],
      1,
    );

    expect(hasil.items).toEqual([
      { label: "C", value: 2, persentase: 50 },
      { label: "Tema lain", value: 2, persentase: 50 },
    ]);
  });
});
