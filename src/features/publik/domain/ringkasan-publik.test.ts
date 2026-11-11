import { describe, expect, it } from "vitest";

import { formatJumlah, rekapInventaris } from "./ringkasan-publik";

describe("rekapInventaris", () => {
  it("mengembalikan nol untuk daftar kosong", () => {
    const rekap = rekapInventaris([]);
    expect(rekap.jumlahBarang).toBe(0);
    expect(rekap.totalUnit).toBe("0.00");
    expect(rekap.totalNilai).toBe("0.00");
    expect(rekap.perKategori).toEqual([]);
    expect(rekap.perKondisi).toEqual([]);
  });

  it("menjumlahkan unit dan nilai per kategori", () => {
    const rekap = rekapInventaris([
      {
        kategoriNama: "Kendaraan",
        jumlah: "2.00",
        nilaiAkhir: "15000000.00",
        kondisi: "baik",
      },
      {
        kategoriNama: "Kendaraan",
        jumlah: "1.00",
        nilaiAkhir: "5000000.00",
        kondisi: "rusak_ringan",
      },
      {
        kategoriNama: null,
        jumlah: "3.50",
        nilaiAkhir: null,
        kondisi: "baik",
      },
    ]);

    expect(rekap.jumlahBarang).toBe(3);
    expect(rekap.totalUnit).toBe("6.50");
    expect(rekap.totalNilai).toBe("20000000.00");
    expect(rekap.perKategori).toEqual([
      { nama: "Kendaraan", jumlah: 2, unit: "3.00", nilai: "20000000.00" },
      { nama: "Tanpa kategori", jumlah: 1, unit: "3.50", nilai: "0.00" },
    ]);
    expect(rekap.perKondisi).toEqual([
      { kondisi: "baik", jumlah: 2 },
      { kondisi: "rusak_ringan", jumlah: 1 },
    ]);
  });

  it("tidak membulatkan nilai uang melalui floating point", () => {
    const rekap = rekapInventaris([
      { kategoriNama: "A", jumlah: "1.00", nilaiAkhir: "0.10", kondisi: "baik" },
      { kategoriNama: "A", jumlah: "1.00", nilaiAkhir: "0.20", kondisi: "baik" },
    ]);

    expect(rekap.totalNilai).toBe("0.30");
  });
});

describe("formatJumlah", () => {
  it("menghilangkan nol di belakang koma", () => {
    expect(formatJumlah("12.00")).toBe("12");
    expect(formatJumlah("12.50")).toBe("12,5");
  });

  it("mengembalikan nol untuk nilai kosong atau tidak valid", () => {
    expect(formatJumlah(null)).toBe("0");
    expect(formatJumlah("bukan-angka")).toBe("0");
  });
});
