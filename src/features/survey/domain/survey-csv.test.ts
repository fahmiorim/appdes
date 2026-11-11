import { describe, expect, it } from "vitest";

import type { JawabanRow, RespondenRow, SoalRow } from "./survey";
import {
  buildSurveyCsv,
  csvCell,
  MAKS_BARIS_IMPOR,
  normalisasiNikCsv,
  parseCsv,
  parseSurveyCsv,
  surveyCsvFilename,
} from "./survey-csv";

const SOAL: SoalRow[] = [
  {
    id: 11,
    surveyId: 1,
    pertanyaan: "Nama program",
    tipe: "text",
    pilihan: [],
    bobot: 1,
    skorPilihan: {},
    indikatorId: null,
    urutan: 1,
  },
  {
    id: 12,
    surveyId: 1,
    pertanyaan: "Jumlah penerima",
    tipe: "number",
    pilihan: [],
    bobot: 1,
    skorPilihan: {},
    indikatorId: null,
    urutan: 2,
  },
  {
    id: 13,
    surveyId: 1,
    pertanyaan: "Kepuasan",
    tipe: "choice",
    pilihan: ["Puas", "Tidak Puas"],
    bobot: 1,
    skorPilihan: { Puas: 5, "Tidak Puas": 0 },
    indikatorId: null,
    urutan: 3,
  },
];

const RESPONDEN: RespondenRow[] = [
  {
    id: 21,
    nama: "Budi Santoso",
    nik: "3201010101010001",
    createdAt: new Date(2026, 9, 24, 10, 30),
    jumlahJawaban: 3,
  },
  {
    id: 22,
    nama: 'Siti "Ayu"',
    nik: null,
    createdAt: new Date(2026, 9, 25, 8, 0),
    jumlahJawaban: 3,
  },
];

const JAWABAN: JawabanRow[] = [
  { respondenId: 21, soalId: 11, jawaban: "BLT; Desa" },
  { respondenId: 21, soalId: 12, jawaban: "120" },
  { respondenId: 21, soalId: 13, jawaban: "Puas" },
  { respondenId: 22, soalId: 11, jawaban: "Baris\nbaru" },
  { respondenId: 22, soalId: 12, jawaban: "0" },
  { respondenId: 22, soalId: 13, jawaban: "Tidak Puas" },
];

describe("csvCell", () => {
  it("mengutip sel yang memuat pemisah, kutip, atau baris baru", () => {
    expect(csvCell("biasa")).toBe("biasa");
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('kata "kutip"')).toBe('"kata ""kutip"""');
    expect(csvCell("baris\nbaru")).toBe('"baris\nbaru"');
  });

  it("melindungi formula tetapi membiarkan angka negatif", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-5")).toBe("-5");
    expect(csvCell("-5,5")).toBe("-5,5");
  });
});

describe("parseCsv", () => {
  it("membaca kutip, kutip ganda, BOM, dan CRLF", () => {
    const text = '\uFEFFNama;Catatan\r\nBudi;"a;b"\r\nSiti;"kata ""kutip"""\r\n';

    expect(parseCsv(text)).toEqual([
      ["Nama", "Catatan"],
      ["Budi", "a;b"],
      ["Siti", 'kata "kutip"'],
    ]);
  });

  it("membaca baris terakhir tanpa penutup baris dan mengabaikan baris kosong", () => {
    expect(parseCsv("A;B\n\n1;2")).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
});

describe("buildSurveyCsv", () => {
  it("menulis header identitas + pertanyaan sesuai urutan soal", () => {
    const csv = buildSurveyCsv({ soal: SOAL, responden: RESPONDEN, jawaban: JAWABAN });
    const rows = parseCsv(csv);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(rows[0]).toEqual([
      "Nama",
      "NIK",
      "Tanggal",
      "Nama program",
      "Jumlah penerima",
      "Kepuasan",
    ]);
    expect(rows[1]).toEqual([
      "Budi Santoso",
      "'3201010101010001",
      "2026-10-24",
      "BLT; Desa",
      "120",
      "Puas",
    ]);
    expect(rows[2]?.[0]).toBe('Siti "Ayu"');
    expect(rows[2]?.[1]).toBe("");
    expect(rows[2]?.[3]).toBe("Baris\nbaru");
  });

  it("dapat diimpor kembali tanpa kehilangan data", () => {
    const csv = buildSurveyCsv({ soal: SOAL, responden: RESPONDEN, jawaban: JAWABAN });
    const hasil = parseSurveyCsv(csv, SOAL);

    expect(hasil.kesalahan).toEqual([]);
    expect(hasil.baris).toHaveLength(2);
    expect(hasil.baris[0]).toMatchObject({
      nama: "Budi Santoso",
      nik: "3201010101010001",
      jawaban: { "11": "BLT; Desa", "12": "120", "13": "Puas" },
    });
    expect(hasil.baris[1]?.nik).toBeNull();
    expect(hasil.baris[1]?.jawaban["11"]).toBe("Baris\nbaru");
  });
});

describe("parseSurveyCsv", () => {
  it("menerima berkas tanpa header (semua baris data)", () => {
    const hasil = parseSurveyCsv("Budi;3201010101010001;2026-10-24;BLT;10;Puas", SOAL);

    expect(hasil.kesalahan).toEqual([]);
    expect(hasil.baris[0]?.baris).toBe(1);
    expect(hasil.baris[0]?.nama).toBe("Budi");
  });

  it("menolak NIK bukan 16 angka dan nama kosong", () => {
    const hasil = parseSurveyCsv(
      ["Nama;NIK;Tanggal;A;B;C", ";3201;x;BLT;10;Puas", "Siti;123;x;BLT;10;Puas"].join("\n"),
      SOAL,
    );

    expect(hasil.baris).toHaveLength(0);
    expect(hasil.kesalahan).toEqual([
      { baris: 2, pesan: "Nama wajib diisi." },
      { baris: 3, pesan: "NIK harus 16 angka (atau kosongkan)." },
    ]);
  });

  it("melaporkan jawaban yang tidak lengkap/tidak valid per baris", () => {
    const hasil = parseSurveyCsv(
      ["Nama;NIK;Tanggal;A;B;C", "Budi;;x;BLT;bukan-angka;Puas", "Siti;;x;BLT;10;Lainnya"].join(
        "\n",
      ),
      SOAL,
    );

    expect(hasil.baris).toHaveLength(0);
    expect(hasil.kesalahan[0]?.pesan).toContain("soal 2: Jawaban harus berupa angka.");
    expect(hasil.kesalahan[1]?.pesan).toContain("soal 3: Pilih salah satu pilihan yang tersedia.");
  });

  it("mengabaikan kolom tanggal (dibuat server) dan sel kosong di akhir", () => {
    const hasil = parseSurveyCsv("Nama;NIK;Tanggal;A;B;C\nBudi;;;BLT;10;Puas;catatan", SOAL);

    expect(hasil.kesalahan).toEqual([]);
    expect(hasil.baris[0]?.jawaban).toEqual({ "11": "BLT", "12": "10", "13": "Puas" });
  });

  it("menolak berkas yang melebihi batas baris", () => {
    const baris = Array.from({ length: MAKS_BARIS_IMPOR + 1 }, () => "Budi;;;BLT;10;Puas");
    const hasil = parseSurveyCsv(baris.join("\n"), SOAL);

    expect(hasil.baris).toHaveLength(0);
    expect(hasil.kesalahan[0]?.pesan).toContain("maksimal");
  });
});

describe("normalisasiNikCsv", () => {
  it("menyisakan digit dan mengembalikan null bila kosong", () => {
    expect(normalisasiNikCsv("'3201 0101 0101 0001")).toBe("3201010101010001");
    expect(normalisasiNikCsv("  ")).toBeNull();
  });
});

describe("surveyCsvFilename", () => {
  it("membuat slug aman dari judul", () => {
    expect(surveyCsvFilename("Survei Kepuasan Warga 2026!", 7)).toBe(
      "respons-survei-survei-kepuasan-warga-2026-7.csv",
    );
    expect(surveyCsvFilename("???", 3)).toBe("respons-survei-survei-3.csv");
  });
});
