import { describe, expect, it } from "vitest";

import {
  buildInventarisCsv,
  filterInventarisAktif,
  inventarisCsvFilename,
  inventarisEksporUrl,
  opsiFilterInventaris,
  parseFilterInventaris,
  saringInventaris,
  type BarisInventarisCsv,
} from "./inventaris-publik";

const BARIS: BarisInventarisCsv[] = [
  {
    namaBarang: "Laptop Kantor",
    kodeBarang: "INV-001",
    nomorInventaris: "01.01.01",
    kategoriNama: "Peralatan & Mesin",
    jumlah: "2.00",
    satuan: "unit",
    kondisi: "baik",
    lokasi: "Kantor Desa",
    tahunPembelian: 2025,
    nilaiAkhir: "15000000.00",
  },
  {
    namaBarang: "Kursi Lipat",
    kodeBarang: "INV-002",
    nomorInventaris: null,
    kategoriNama: "Peralatan & Mesin",
    jumlah: "20.00",
    satuan: "buah",
    kondisi: "rusak_ringan",
    lokasi: "Balai Desa",
    tahunPembelian: 2023,
    nilaiAkhir: "4000000.00",
  },
  {
    namaBarang: "Jalan Desa",
    kodeBarang: null,
    nomorInventaris: "02.01.01",
    kategoriNama: null,
    jumlah: "1.00",
    satuan: "unit",
    kondisi: "baik",
    lokasi: null,
    tahunPembelian: null,
    nilaiAkhir: null,
  },
];

const KOSONG = parseFilterInventaris({});

describe("parseFilterInventaris", () => {
  it("memakai nilai semua saat query kosong", () => {
    expect(KOSONG).toEqual({
      cari: "",
      kategori: "",
      kondisi: "",
      lokasi: "",
      tahun: null,
    });
    expect(filterInventarisAktif(KOSONG)).toBe(false);
  });

  it("membaca filter yang dikenal", () => {
    const filter = parseFilterInventaris({
      q: " laptop ",
      kategori: " Peralatan & Mesin ",
      kondisi: "rusak_ringan",
      lokasi: "Kantor Desa",
      tahun: "2025",
    });
    expect(filter).toEqual({
      cari: "laptop",
      kategori: "Peralatan & Mesin",
      kondisi: "rusak_ringan",
      lokasi: "Kantor Desa",
      tahun: 2025,
    });
    expect(filterInventarisAktif(filter)).toBe(true);
  });

  it("mengabaikan kondisi dan tahun yang tidak valid", () => {
    const filter = parseFilterInventaris({ kondisi: "hilang", tahun: "3000" });
    expect(filter.kondisi).toBe("");
    expect(filter.tahun).toBeNull();
  });

  it("membatasi panjang kata kunci", () => {
    const filter = parseFilterInventaris({ q: "x".repeat(500) });
    expect(filter.cari).toHaveLength(100);
  });
});

describe("saringInventaris", () => {
  it("menyaring kategori, kondisi, lokasi, dan tahun sekaligus", () => {
    const hasil = saringInventaris(
      BARIS,
      parseFilterInventaris({
        kategori: "Peralatan & Mesin",
        kondisi: "baik",
        lokasi: "Kantor Desa",
        tahun: "2025",
      }),
    );
    expect(hasil.map((item) => item.namaBarang)).toEqual(["Laptop Kantor"]);
  });

  it("mencari nama dan nomor inventaris tanpa peduli huruf besar", () => {
    expect(saringInventaris(BARIS, parseFilterInventaris({ q: "KURSI" }))).toHaveLength(1);
    expect(saringInventaris(BARIS, parseFilterInventaris({ q: "02.01" }))).toHaveLength(1);
  });

  it("mengembalikan semua baris saat filter kosong", () => {
    expect(saringInventaris(BARIS, KOSONG)).toHaveLength(3);
  });

  it("tidak memakai nomor inventaris sebagai kode barang", () => {
    expect(saringInventaris(BARIS, parseFilterInventaris({ q: "INV-002" }))).toHaveLength(1);
  });
});

describe("opsiFilterInventaris", () => {
  it("mengumpulkan pilihan unik dan mengurutkannya", () => {
    const opsi = opsiFilterInventaris(BARIS);
    expect(opsi.kategori).toEqual(["Peralatan & Mesin"]);
    expect(opsi.lokasi).toEqual(["Balai Desa", "Kantor Desa"]);
    expect(opsi.tahun).toEqual([2025, 2023]);
  });
});

describe("buildInventarisCsv", () => {
  it("menyusun header, BOM, dan baris data", () => {
    const csv = buildInventarisCsv(BARIS);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Nama Barang;Kode;Nomor Inventaris;Kategori");
    expect(csv).toContain("Laptop Kantor;INV-001;01.01.01;Peralatan & Mesin;2.00;unit;Baik");
    expect(csv).toContain("Kursi Lipat;INV-002;;Peralatan & Mesin;20.00;buah;Rusak Ringan");
    expect(csv.split("\r\n")).toHaveLength(BARIS.length + 1);
  });

  it("mengutip sel yang memuat pemisah dan melindungi formula", () => {
    const csv = buildInventarisCsv([
      { ...BARIS[0]!, namaBarang: 'Meja; besar "khusus"', kodeBarang: "=SUM(A1)" },
    ]);
    expect(csv).toContain('"Meja; besar ""khusus"""');
    expect(csv).toContain("'=SUM(A1)");
  });
});

describe("inventarisEksporUrl", () => {
  it("membawa seluruh filter aktif", () => {
    const url = inventarisEksporUrl(
      parseFilterInventaris({ q: "meja", kondisi: "baik", tahun: "2025" }),
    );
    expect(url).toBe("/desa/inventaris/ekspor?q=meja&kondisi=baik&tahun=2025");
  });

  it("memakai URL dasar saat tanpa filter", () => {
    expect(inventarisEksporUrl(KOSONG)).toBe("/desa/inventaris/ekspor");
  });
});

describe("inventarisCsvFilename", () => {
  it("membuat nama berkas dari nama desa", () => {
    expect(inventarisCsvFilename("Desa Sukamaju")).toBe("inventaris-desa-sukamaju.csv");
    expect(inventarisCsvFilename(null)).toBe("inventaris-desa.csv");
  });
});
