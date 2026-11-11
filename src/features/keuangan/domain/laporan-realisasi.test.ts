import { describe, expect, it } from "vitest";

import type { KeuanganBarisDTO } from "@/features/keuangan/domain/keuangan";
import {
  buildLaporanRealisasiCsv,
  laporanRealisasiCsvFilename,
  susunLaporanRealisasi,
} from "@/features/keuangan/domain/laporan-realisasi";

function baris(
  templateUuid: string,
  uraian: string,
  anggaran: string,
  realisasi: string,
): KeuanganBarisDTO {
  return { templateUuid, uraian, level: templateUuid.trim().length, anggaran, realisasi };
}

const CONTOH: KeuanganBarisDTO[] = [
  baris("4", "PENDAPATAN", "1000.00", "400.00"),
  baris("4.1", "PENDAPATAN ASLI DESA", "1000.00", "400.00"),
  baris("4.1.1", "HASIL USAHA", "1000.00", "400.00"),
  baris("5", "BELANJA", "600.00", "300.00"),
  baris("5.1", "PENYELENGGARAAN PEMERINTAHAN", "600.00", "300.00"),
  baris("5.1.1", "PENGHASILAN TETAP", "600.00", "300.00"),
  baris("6", "PEMBIAYAAN", "-100.00", "50.00"),
  baris("6.1", "PENERIMAAN PEMBIAYAAN", "-100.00", "50.00"),
  baris("1", "ASET", "999.00", "999.00"),
];

describe("susunLaporanRealisasi", () => {
  it("hanya menampilkan akun yang dapat dilaporkan (4, 5, 6)", () => {
    const laporan = susunLaporanRealisasi(CONTOH);

    expect(laporan.blok.map((item) => item.akun.kode)).toEqual(["4", "5", "6"]);
  });

  it("menyusun keturunan akun berurutan beserta kedalamannya", () => {
    const laporan = susunLaporanRealisasi(CONTOH);
    const pendapatan = laporan.blok[0];

    expect(pendapatan?.baris.map((row) => row.kode)).toEqual(["4.1", "4.1.1"]);
    expect(pendapatan?.baris.map((row) => row.depth)).toEqual([2, 3]);
    expect(pendapatan?.akun.depth).toBe(1);
  });

  it("mengisi total blok dari nilai akun yang sudah teragregasi", () => {
    const laporan = susunLaporanRealisasi(CONTOH);

    expect(laporan.blok[0]?.total).toEqual({
      anggaran: "1000.00",
      realisasi: "400.00",
      selisih: "600.00",
    });
    expect(laporan.blok[1]?.total).toEqual({
      anggaran: "600.00",
      realisasi: "300.00",
      selisih: "300.00",
    });
  });

  it("menghitung surplus, pembiayaan netto, dan SiLPA", () => {
    const laporan = susunLaporanRealisasi(CONTOH);

    expect(laporan.surplus).toEqual({
      anggaran: "400.00",
      realisasi: "100.00",
      selisih: "300.00",
    });
    expect(laporan.pembiayaanNetto).toEqual({
      anggaran: "-100.00",
      realisasi: "50.00",
      selisih: "-150.00",
    });
    expect(laporan.silpa).toEqual({
      anggaran: "300.00",
      realisasi: "150.00",
      selisih: "150.00",
    });
  });

  it("mengosongkan persentase pembiayaan dan mengisi akun lain", () => {
    const laporan = susunLaporanRealisasi(CONTOH);

    expect(laporan.blok[0]?.akun.persen).toBe(40);
    expect(laporan.blok[2]?.akun.persen).toBeNull();
    expect(laporan.blok[2]?.baris[0]?.persen).toBeNull();
  });

  it("tetap utuh saat belum ada data sama sekali", () => {
    const laporan = susunLaporanRealisasi([]);

    expect(laporan.blok.map((item) => item.akun.kode)).toEqual(["4", "5", "6"]);
    expect(laporan.blok[0]?.akun.uraian).toBe("PENDAPATAN");
    expect(laporan.blok[0]?.baris).toEqual([]);
    expect(laporan.surplus.anggaran).toBe("0.00");
    expect(laporan.silpa.realisasi).toBe("0.00");
  });

  it("menjumlahkan nilai desimal tanpa galat pembulatan", () => {
    const laporan = susunLaporanRealisasi([
      baris("4", "PENDAPATAN", "0.10", "0.20"),
      baris("5", "BELANJA", "0.02", "0.01"),
      baris("6", "PEMBIAYAAN", "0.00", "0.00"),
    ]);

    expect(laporan.surplus.anggaran).toBe("0.08");
    expect(laporan.surplus.realisasi).toBe("0.19");
  });

  it("membiarkan selisih negatif saat realisasi melebihi pagu", () => {
    const laporan = susunLaporanRealisasi([baris("4", "PENDAPATAN", "10.00", "15.00")]);

    expect(laporan.blok[0]?.akun.selisih).toBe("-5.00");
  });
});

describe("buildLaporanRealisasiCsv", () => {
  const csv = buildLaporanRealisasiCsv({
    namaDesa: "Sukamaju",
    kecamatan: "Ciawi",
    tahun: 2026,
    laporan: susunLaporanRealisasi(CONTOH),
  });

  it("memuat kop laporan dan baris penutup resmi", () => {
    expect(csv).toContain("Laporan Realisasi Pelaksanaan APBDes");
    expect(csv).toContain("Desa;Sukamaju");
    expect(csv).toContain("JUMLAH PENDAPATAN");
    expect(csv).toContain("JUMLAH BELANJA");
    expect(csv).toContain("SURPLUS / (DEFISIT)");
    expect(csv).toContain("PEMBIAYAAN NETTO");
    expect(csv).toContain("SILPA/SiLPA TAHUN BERJALAN");
  });

  it("menulis angka desimal polos yang bisa dijumlahkan", () => {
    expect(csv).toContain("4;PENDAPATAN;1000.00;400.00;600.00;40.00");
    expect(csv).toContain(";SURPLUS / (DEFISIT);400.00;100.00;300.00;");
  });

  it("memberi awalan BOM agar Excel membaca UTF-8", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
});

describe("laporanRealisasiCsvFilename", () => {
  it("membentuk nama berkas aman dari nama desa", () => {
    expect(laporanRealisasiCsvFilename("Suka Maju!", 2026)).toBe(
      "rincian-realisasi-suka-maju-2026.csv",
    );
    expect(laporanRealisasiCsvFilename(null, 2025)).toBe("rincian-realisasi-desa-2025.csv");
  });
});
