import { describe, expect, it } from "vitest";

import {
  buildInventarisCsv,
  inventarisCsvFilename,
  neracaAset,
  rekapPerKategori,
  type LaporanInventarisItem,
} from "./laporan-inventaris";

function item(overrides: Partial<LaporanInventarisItem>): LaporanInventarisItem {
  return {
    id: 1,
    kategoriId: 1,
    nomorInventaris: null,
    namaBarang: "Barang",
    kodeBarang: null,
    merk: null,
    tipe: null,
    spesifikasi: null,
    jumlah: "1.00",
    satuan: null,
    hargaSatuan: null,
    nilaiAkhir: "0.00",
    tahunPembelian: null,
    tanggalPembelian: null,
    asal: null,
    donatur: null,
    kondisi: "baik",
    lokasi: null,
    keterangan: null,
    kategoriNama: "Tanah",
    kategoriKode: "1.3.1",
    ...overrides,
  };
}

const sampel: LaporanInventarisItem[] = [
  item({
    id: 1,
    kategoriId: 1,
    kategoriNama: "Tanah",
    jumlah: "2.00",
    nilaiAkhir: "1000.00",
    kondisi: "baik",
  }),
  item({
    id: 2,
    kategoriId: 1,
    kategoriNama: "Tanah",
    jumlah: "1.00",
    nilaiAkhir: "500.00",
    kondisi: "rusak_ringan",
  }),
  item({
    id: 3,
    kategoriId: 2,
    kategoriNama: "Peralatan & Mesin",
    kategoriKode: "1.3.2",
    jumlah: "5.00",
    nilaiAkhir: "250.00",
    kondisi: "rusak_berat",
  }),
  item({
    id: 4,
    kategoriId: null,
    kategoriNama: null,
    kategoriKode: null,
    jumlah: "3.00",
    nilaiAkhir: "0.00",
  }),
];

describe("rekapPerKategori", () => {
  it("menjumlahkan unit dan nilai per kategori", () => {
    const rekap = rekapPerKategori(sampel);
    const tanah = rekap.baris.find((b) => b.kategoriId === 1);
    expect(tanah).toMatchObject({
      nama: "Tanah",
      jumlahBarang: 2,
      totalUnit: "3.00",
      totalNilai: "1500.00",
    });
  });

  it("mengelompokkan aset tanpa kategori terpisah", () => {
    const rekap = rekapPerKategori(sampel);
    const tanpa = rekap.baris.find((b) => b.kategoriId === null);
    expect(tanpa?.nama).toBe("Tanpa kategori");
    expect(tanpa?.jumlahBarang).toBe(1);
  });

  it("menghitung grand total keseluruhan", () => {
    const rekap = rekapPerKategori(sampel);
    expect(rekap.total).toEqual({
      jumlahBarang: 4,
      totalUnit: "11.00",
      totalNilai: "1750.00",
    });
  });

  it("mengurutkan baris menurut nama kategori", () => {
    const nama = rekapPerKategori(sampel).baris.map((b) => b.nama);
    expect(nama).toEqual(["Peralatan & Mesin", "Tanah", "Tanpa kategori"]);
  });
});

describe("neracaAset", () => {
  it("memecah nilai aset per kondisi dalam tiap kategori", () => {
    const neraca = neracaAset(sampel);
    const tanah = neraca.baris.find((b) => b.kategoriId === 1);
    expect(tanah?.nilaiPerKondisi).toEqual({
      baik: "1000.00",
      rusak_ringan: "500.00",
      rusak_berat: "0.00",
    });
    expect(tanah?.totalNilai).toBe("1500.00");
  });

  it("menjumlahkan total per kondisi dan grand total kekayaan", () => {
    const neraca = neracaAset(sampel);
    expect(neraca.totalPerKondisi).toEqual({
      baik: "1000.00",
      rusak_ringan: "500.00",
      rusak_berat: "250.00",
    });
    expect(neraca.grandTotal).toBe("1750.00");
  });
});

describe("buildInventarisCsv", () => {
  it("menyertakan seluruh aset dan baris jumlah", () => {
    const csv = buildInventarisCsv(sampel);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const baris = csv.split("\r\n");
    // header + 4 data + total
    expect(baris).toHaveLength(6);
    expect(baris[baris.length - 1]).toContain("Jumlah");
    expect(baris[baris.length - 1]).toContain("1750.00");
  });

  it("menyaring per kategori bila kategoriId diberikan", () => {
    const csv = buildInventarisCsv(sampel, 1);
    const baris = csv.split("\r\n");
    // header + 2 data (kategori 1) + total
    expect(baris).toHaveLength(4);
    expect(baris[baris.length - 1]).toContain("1500.00");
  });

  it("melabeli kondisi dengan teks dan membungkus sel bertanda pemisah", () => {
    const csv = buildInventarisCsv([
      item({ namaBarang: "Meja; Kursi", kondisi: "rusak_berat", nilaiAkhir: "10.00" }),
    ]);
    expect(csv).toContain('"Meja; Kursi"');
    expect(csv).toContain("Rusak Berat");
  });
});

describe("inventarisCsvFilename", () => {
  it("membuat nama berkas dari nama desa", () => {
    expect(inventarisCsvFilename("Desa Suka Maju")).toBe("laporan-inventaris-desa-suka-maju.csv");
  });

  it("menambahkan slug kategori bila ada", () => {
    expect(inventarisCsvFilename("Sukamaju", "Peralatan & Mesin")).toBe(
      "laporan-inventaris-sukamaju-peralatan-mesin.csv",
    );
  });

  it("jatuh ke desa bila nama kosong", () => {
    expect(inventarisCsvFilename(null)).toBe("laporan-inventaris-desa.csv");
  });
});
