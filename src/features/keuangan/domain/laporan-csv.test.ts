import { describe, expect, it } from "vitest";

import { buildLaporanCsv, csvCell, laporanCsvFilename, toCsv } from "./laporan-csv";

describe("csvCell", () => {
  it("membiarkan sel sederhana apa adanya", () => {
    expect(csvCell("PENDAPATAN")).toBe("PENDAPATAN");
  });

  it("mengutip sel yang mengandung pemisah", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
  });

  it("menggandakan kutip di dalam sel", () => {
    expect(csvCell('kata "penting"')).toBe('"kata ""penting"""');
  });

  it("mengutip sel yang mengandung baris baru", () => {
    expect(csvCell("baris1\nbaris2")).toBe('"baris1\nbaris2"');
  });
});

describe("toCsv", () => {
  it("menggabungkan sel dengan pemisah titik-koma dan CRLF", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a;b\r\nc;d");
  });
});

describe("laporanCsvFilename", () => {
  it("membuat nama berkas aman dari nama desa", () => {
    expect(laporanCsvFilename("Desa Contoh", 2026)).toBe("laporan-apbdes-desa-contoh-2026.csv");
  });

  it("memakai 'desa' bila nama kosong", () => {
    expect(laporanCsvFilename(null, 2025)).toBe("laporan-apbdes-desa-2025.csv");
  });
});

describe("buildLaporanCsv", () => {
  const input = {
    namaDesa: "Desa Contoh",
    kecamatan: "Kecamatan Contoh",
    tahun: 2026,
    baris: [
      {
        kode: "4",
        uraian: "PENDAPATAN",
        anggaran: "1000000.00",
        realisasi: "250000.00",
        selisih: "750000.00",
        persen: 25,
      },
    ],
    total: { anggaran: "1000000.00", realisasi: "250000.00", selisih: "750000.00" },
    bidang: [
      {
        kode: "5.2",
        uraian: "BELANJA BIDANG PEMBANGUNAN",
        anggaran: "500000.00",
        realisasi: "100000.00",
        selisih: "400000.00",
        persen: 20,
      },
    ],
    totalBidang: { anggaran: "500000.00", realisasi: "100000.00", selisih: "400000.00" },
  };

  it("memulai dengan BOM agar Excel mengenali UTF-8", () => {
    expect(buildLaporanCsv(input).startsWith("\uFEFF")).toBe(true);
  });

  it("memuat identitas desa dan tahun", () => {
    const csv = buildLaporanCsv(input);
    expect(csv).toContain("Desa;Desa Contoh");
    expect(csv).toContain("Tahun Anggaran;2026");
  });

  it("memuat angka sebagai desimal polos agar bisa dijumlahkan", () => {
    const csv = buildLaporanCsv(input);
    expect(csv).toContain("4;PENDAPATAN;1000000.00;250000.00;750000.00;25.00");
  });

  it("memuat bagian realisasi per bidang", () => {
    const csv = buildLaporanCsv(input);
    expect(csv).toContain("Realisasi Belanja per Bidang");
    expect(csv).toContain("5.2;BELANJA BIDANG PEMBANGUNAN;500000.00;100000.00;400000.00;20.00");
  });
});
