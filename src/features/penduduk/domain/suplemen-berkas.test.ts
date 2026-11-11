import { describe, expect, it } from "vitest";

import { petakanKolom } from "@/lib/spreadsheet";

import {
  bacaIsian,
  buildSuplemenCsv,
  buildSuplemenRekapCsv,
  hitungRekapSuplemen,
  KOLOM_IMPOR_SUPLEMEN,
  kolomIsian,
  MAKS_PANJANG_KOLOM_ISIAN,
  normalisasiIsian,
  suplemenFilename,
  suplemenRekapFilename,
  type SuplemenEksporRow,
} from "./suplemen-berkas";

const labelSasaran = (sasaran: number) => (sasaran === 2 ? "Keluarga (KK)" : "Penduduk");

describe("isian dinamis suplemen", () => {
  it("merapikan pasangan nama–nilai dan mengabaikan baris tanpa nama", () => {
    expect(
      normalisasiIsian([
        { nama: " Jenis Disabilitas ", nilai: " Fisik " },
        { nama: "   ", nilai: "diabaikan" },
        { nama: "Jenis Disabilitas", nilai: "Netra" },
      ]),
    ).toEqual({ "Jenis Disabilitas": "Netra" });
  });

  it("memotong nama kolom dan nilai yang terlalu panjang", () => {
    const hasil = normalisasiIsian([{ nama: "A".repeat(80), nilai: "B".repeat(300) }]);

    expect(Object.keys(hasil)[0]).toHaveLength(MAKS_PANJANG_KOLOM_ISIAN);
    expect(Object.values(hasil)[0]?.length).toBeLessThanOrEqual(200);
  });

  it("membaca isian dari JSON, string JSON, dan nilai kosong", () => {
    expect(bacaIsian({ a: "1", b: 2, c: null, d: { x: 1 } })).toEqual({ a: "1", b: "2" });
    expect(bacaIsian('{"Keterangan":"Penerima PKH"}')).toEqual({ Keterangan: "Penerima PKH" });
    expect(bacaIsian("bukan json")).toEqual({});
    expect(bacaIsian(null)).toEqual({});
  });

  it("menghimpun nama kolom dari seluruh baris tanpa duplikat", () => {
    expect(
      kolomIsian([{ isian: { B: "1" } }, { isian: { A: "2", B: "3" } }, { isian: {} }]),
    ).toEqual(["A", "B"]);
  });
});

describe("impor terdata suplemen", () => {
  it("membaca kolom sasaran dan menyisakan kolom lain sebagai isian dinamis", () => {
    const hasil = petakanKolom(
      [
        ["NIK", "Keterangan", "Jenis Disabilitas"],
        ["3201010000000001", "Penerima PKH", "Fisik"],
      ],
      KOLOM_IMPOR_SUPLEMEN,
    );

    expect(hasil.baris[0]?.nilai).toEqual({ sasaran: "3201010000000001" });
    expect(hasil.baris[0]?.tambahan).toEqual({
      Keterangan: "Penerima PKH",
      "Jenis Disabilitas": "Fisik",
    });
    expect(hasil.galat).toEqual([]);
  });

  it("menerima header No. KK dan menolak baris tanpa sasaran", () => {
    const hasil = petakanKolom(
      [
        ["No. KK", "Keterangan"],
        ["3201012001000001", "Penerima PKH"],
        ["", "Tanpa KK"],
      ],
      KOLOM_IMPOR_SUPLEMEN,
    );

    expect(hasil.baris).toEqual([
      {
        baris: 1,
        nilai: { sasaran: "3201012001000001" },
        tambahan: { Keterangan: "Penerima PKH" },
      },
    ]);
    expect(hasil.galat).toEqual([{ baris: 2, pesan: "Kolom wajib kosong: NIK / No. KK." }]);
  });
});

describe("ekspor & laporan suplemen", () => {
  const rows: SuplemenEksporRow[] = [
    { label: "Ani — 3201010000000001", isian: { Keterangan: "Penerima PKH" } },
    { label: "Budi — 3201010000000002", isian: {} },
  ];

  it("menyusun CSV dengan kolom isian mengikuti data", () => {
    const csv = buildSuplemenCsv({
      namaDesa: "Sukamaju",
      namaSuplemen: "Penerima PKH",
      sasaranLabel: labelSasaran(1),
      rows,
    });

    expect(csv).toContain("Penerima PKH");
    expect(csv).toContain("Sasaran: Penduduk");
    expect(csv).toContain("No;Sasaran;Keterangan");
    expect(csv).toContain("1;Ani — 3201010000000001;Penerima PKH");
    expect(csv).toContain("2;Budi — 3201010000000002;-");
  });

  it("membuat nama berkas yang aman dari nama suplemen dan desa", () => {
    expect(suplemenFilename("Penerima PKH / Bansos!")).toBe("suplemen-penerima-pkh-bansos.csv");
    expect(suplemenFilename("!!!")).toBe("suplemen-suplemen.csv");
    expect(suplemenRekapFilename("Sukamaju")).toBe("rekap-suplemen-sukamaju.csv");
    expect(suplemenRekapFilename(null)).toBe("rekap-suplemen-desa.csv");
  });

  it("menghitung rekapitulasi terdata per suplemen", () => {
    const rekap = hitungRekapSuplemen(
      [
        { id: 1, nama: "Disabilitas", sasaran: 1, jumlahTerdata: 3 },
        { id: 2, nama: "Penerima PKH", sasaran: 2, jumlahTerdata: 1 },
        { id: 3, nama: "Kosong", sasaran: 1, jumlahTerdata: 0 },
      ],
      labelSasaran,
    );

    expect(rekap.totalSuplemen).toBe(3);
    expect(rekap.totalTerdata).toBe(4);
    expect(rekap.rows[0]).toEqual({
      nama: "Disabilitas",
      sasaran: "Penduduk",
      jumlahTerdata: 3,
      percentage: 75,
    });
    expect(rekap.rows[1]?.percentage).toBe(25);
    expect(rekap.rows[2]?.nama).toBe("Kosong");
  });

  it("tidak membagi nol saat belum ada terdata", () => {
    const rekap = hitungRekapSuplemen(
      [{ id: 1, nama: "Kosong", sasaran: 1, jumlahTerdata: 0 }],
      labelSasaran,
    );

    expect(rekap.totalTerdata).toBe(0);
    expect(rekap.rows[0]?.percentage).toBe(0);

    const csv = buildSuplemenRekapCsv({ namaDesa: null, rekap });
    expect(csv).toContain("Rekapitulasi Data Suplemen");
    expect(csv).toContain("Kosong;Penduduk;0;0%");
  });
});
