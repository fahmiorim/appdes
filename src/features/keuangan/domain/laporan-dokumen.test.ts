import { describe, expect, it } from "vitest";

import {
  berkasLaporanAman,
  buildLaporanExcel,
  escapeXml,
  laporanDokumenFormSchema,
  laporanExcelFilename,
  laporanTipeLabel,
  rangkumPeriode,
  selAngka,
  selTeks,
  semesterLabel,
  sudahDiserahkan,
  tanggalPenyerahan,
  tanggalUntukInput,
  validasiBerkasLaporan,
  type LaporanDokumenRow,
} from "./laporan-dokumen";

function row(partial: Partial<LaporanDokumenRow>): LaporanDokumenRow {
  return {
    id: 1,
    tipe: "laporan_apbdes",
    tipeLabel: "Laporan APBDes",
    judul: "Laporan APBDes Semester I",
    tahun: 2026,
    semester: 1,
    semesterLabel: "Semester I",
    namaFile: "laporan.pdf",
    diserahkanPada: null,
    dibuatPada: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("laporanTipeLabel & semesterLabel", () => {
  it("memberi label Indonesia untuk jenis laporan", () => {
    expect(laporanTipeLabel("laporan_apbdes")).toBe("Laporan APBDes");
    expect(laporanTipeLabel("laporan_penduduk")).toBe("Laporan Penduduk");
  });

  it("mengembalikan kode apa adanya bila tidak dikenal", () => {
    expect(laporanTipeLabel("lain")).toBe("lain");
  });

  it("memberi label semester I & II", () => {
    expect(semesterLabel(1)).toBe("Semester I");
    expect(semesterLabel(2)).toBe("Semester II");
  });
});

describe("sudahDiserahkan", () => {
  it("false bila belum ada tanggal penyerahan", () => {
    expect(sudahDiserahkan(null)).toBe(false);
    expect(sudahDiserahkan("   ")).toBe(false);
  });

  it("true bila sudah ada tanggal penyerahan", () => {
    expect(sudahDiserahkan("2026-02-01T00:00:00.000Z")).toBe(true);
  });
});

describe("tanggalPenyerahan", () => {
  it("mengubah tanggal input menjadi cap waktu ISO pukul 12.00 UTC", () => {
    expect(tanggalPenyerahan("2026-02-01")).toBe("2026-02-01T12:00:00.000Z");
  });

  it("mengembalikan null untuk input kosong", () => {
    expect(tanggalPenyerahan("")).toBeNull();
    expect(tanggalPenyerahan("   ")).toBeNull();
  });

  it("menolak format tanggal yang tidak dikenal", () => {
    expect(tanggalPenyerahan("01-02-2026")).toBeNull();
    expect(tanggalPenyerahan("2026/02/01")).toBeNull();
  });
});

describe("tanggalUntukInput", () => {
  it("memotong cap waktu ISO menjadi YYYY-MM-DD", () => {
    expect(tanggalUntukInput("2026-02-01T12:00:00.000Z")).toBe("2026-02-01");
  });

  it("mengembalikan string kosong bila belum diserahkan", () => {
    expect(tanggalUntukInput(null)).toBe("");
  });
});

describe("validasiBerkasLaporan", () => {
  it("menolak berkas kosong", () => {
    expect(validasiBerkasLaporan(null)).toBe("Berkas laporan wajib dipilih.");
  });

  it("menolak ukuran nol", () => {
    expect(validasiBerkasLaporan({ nama: "a.pdf", ukuran: 0, tipe: "application/pdf" })).toBe(
      "Berkas laporan kosong.",
    );
  });

  it("menolak berkas melebihi 8 MB", () => {
    expect(
      validasiBerkasLaporan({
        nama: "a.pdf",
        ukuran: 9 * 1024 * 1024,
        tipe: "application/pdf",
      }),
    ).toBe("Ukuran berkas maksimal 8 MB.");
  });

  it("menolak berkas non-PDF", () => {
    expect(
      validasiBerkasLaporan({ nama: "a.docx", ukuran: 1000, tipe: "application/msword" }),
    ).toBe("Berkas laporan harus berformat PDF.");
  });

  it("menolak PDF tanpa ekstensi .pdf", () => {
    expect(validasiBerkasLaporan({ nama: "laporan", ukuran: 1000, tipe: "application/pdf" })).toBe(
      "Berkas laporan harus berekstensi .pdf.",
    );
  });

  it("menerima PDF yang wajar", () => {
    expect(
      validasiBerkasLaporan({ nama: "laporan.pdf", ukuran: 2048, tipe: "application/pdf" }),
    ).toBeNull();
  });
});

describe("berkasLaporanAman", () => {
  it("membersihkan nama berkas menjadi slug", () => {
    expect(berkasLaporanAman("Laporan APBDes 2026.pdf")).toBe("laporan-apbdes-2026.pdf");
  });

  it("selalu berakhiran .pdf", () => {
    expect(berkasLaporanAman("../../etc/passwd")).toBe("etc-passwd.pdf");
  });

  it("memberi nama cadangan bila slug kosong", () => {
    expect(berkasLaporanAman("...pdf")).toBe("laporan.pdf");
  });
});

describe("rangkumPeriode", () => {
  it("menandai semester yang belum ada", () => {
    const hasil = rangkumPeriode([row({ tahun: 2026, semester: 1 })], 2026);
    expect(hasil.jumlahDokumen).toBe(1);
    expect(hasil.tercatat).toEqual(["2026-S1"]);
    expect(hasil.belumLengkap).toBe("Belum ada dokumen Semester II.");
  });

  it("menyatakan lengkap bila kedua semester ada", () => {
    const hasil = rangkumPeriode(
      [row({ tahun: 2026, semester: 1 }), row({ id: 2, tahun: 2026, semester: 2 })],
      2026,
    );
    expect(hasil.belumLengkap).toBeNull();
    expect(hasil.jumlahDokumen).toBe(2);
  });

  it("mengabaikan tahun lain", () => {
    const hasil = rangkumPeriode([row({ tahun: 2025, semester: 1 })], 2026);
    expect(hasil.jumlahDokumen).toBe(0);
    expect(hasil.belumLengkap).toBe("Belum ada dokumen Semester I dan Semester II.");
  });
});

describe("laporanDokumenFormSchema", () => {
  it("menerima metadata yang sah", () => {
    const hasil = laporanDokumenFormSchema.parse({
      tipe: "laporan_apbdes",
      judul: "Laporan APBDes Semester I",
      tahun: "2026",
      semester: "1",
    });
    expect(hasil).toEqual({
      tipe: "laporan_apbdes",
      judul: "Laporan APBDes Semester I",
      tahun: 2026,
      semester: 1,
    });
  });

  it("menolak jenis laporan yang tidak dikenal", () => {
    expect(() =>
      laporanDokumenFormSchema.parse({
        tipe: "lain",
        judul: "Laporan",
        tahun: "2026",
        semester: "1",
      }),
    ).toThrow();
  });

  it("menolak semester di luar 1-2", () => {
    expect(() =>
      laporanDokumenFormSchema.parse({
        tipe: "laporan_apbdes",
        judul: "Laporan",
        tahun: "2026",
        semester: "3",
      }),
    ).toThrow();
  });

  it("menolak judul terlalu pendek", () => {
    expect(() =>
      laporanDokumenFormSchema.parse({
        tipe: "laporan_apbdes",
        judul: "ab",
        tahun: "2026",
        semester: "1",
      }),
    ).toThrow();
  });
});

describe("escapeXml / selTeks / selAngka", () => {
  it("meng-escape karakter khusus XML", () => {
    expect(escapeXml("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("tidak meng-escape ganda ampersand", () => {
    expect(escapeXml("<")).toBe("&lt;");
  });

  it("membangun sel teks", () => {
    expect(selTeks("Pendapatan")).toBe('<Cell><Data ss:Type="String">Pendapatan</Data></Cell>');
  });

  it("membangun sel angka bertipe Number", () => {
    expect(selAngka("1000000.5")).toBe('<Cell><Data ss:Type="Number">1000000.50</Data></Cell>');
  });
});

describe("buildLaporanExcel", () => {
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
        uraian: "BELANJA PEMBANGUNAN",
        anggaran: "500000.00",
        realisasi: "100000.00",
        selisih: "400000.00",
        persen: 20,
      },
    ],
    totalBidang: { anggaran: "500000.00", realisasi: "100000.00", selisih: "400000.00" },
  };

  it("menyatakan dirinya sebagai lembar Excel", () => {
    const xml = buildLaporanExcel(input);
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('ss:Name="Laporan APBDes"');
  });

  it("memuat identitas desa dan tahun", () => {
    const xml = buildLaporanExcel(input);
    expect(xml).toContain("Desa Contoh");
    expect(xml).toContain("Tahun Anggaran");
    expect(xml).toContain("2026");
  });

  it("menulis angka sebagai sel Number agar bisa dijumlahkan", () => {
    const xml = buildLaporanExcel(input);
    expect(xml).toContain('<Data ss:Type="Number">1000000.00</Data>');
    expect(xml).toContain('<Data ss:Type="Number">250000.00</Data>');
  });

  it("memuat bagian realisasi per bidang", () => {
    const xml = buildLaporanExcel(input);
    expect(xml).toContain("Realisasi Belanja per Bidang");
    expect(xml).toContain("BELANJA PEMBANGUNAN");
  });
});

describe("laporanExcelFilename", () => {
  it("membuat nama berkas .xls aman", () => {
    expect(laporanExcelFilename("Desa Contoh", 2026)).toBe("laporan-apbdes-desa-contoh-2026.xls");
  });

  it("memakai 'desa' bila nama kosong", () => {
    expect(laporanExcelFilename(null, 2025)).toBe("laporan-apbdes-desa-2025.xls");
  });
});
