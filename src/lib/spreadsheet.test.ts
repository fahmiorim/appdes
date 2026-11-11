import { describe, expect, it } from "vitest";

import {
  bacaTabelImpor,
  ekstensiImporDidukung,
  parseCsv,
  petakanKolom,
  selCsv,
  templateCsv,
  type KolomImpor,
} from "./spreadsheet";

type Kunci = "nik" | "nama" | "noHp";

const KOLOM: readonly KolomImpor<Kunci>[] = [
  { kunci: "nik", label: "NIK", alias: ["no_ktp"], wajib: true },
  { kunci: "nama", label: "Nama", wajib: true },
  { kunci: "noHp", label: "No. HP", alias: ["telepon"] },
];

describe("parseCsv", () => {
  it("mengurai baris sederhana dengan koma", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("menghormati tanda kutip, koma di dalam sel, dan kutip ganda", () => {
    const hasil = parseCsv('Nama,Keterangan\n"Budi, S.""T""","baris\nbaru"');
    expect(hasil[1]).toEqual(['Budi, S."T"', "baris\nbaru"]);
  });

  it("mendeteksi delimiter titik koma dan membuang BOM", () => {
    const hasil = parseCsv("\uFEFFNIK;Nama\n320101;Ani");
    expect(hasil[0]).toEqual(["NIK", "Nama"]);
    expect(hasil[1]).toEqual(["320101", "Ani"]);
  });

  it("menutup baris yang tidak diakhiri newline", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("cek berkas impor", () => {
  it("mengenali ekstensi yang didukung", () => {
    expect(ekstensiImporDidukung("data.CSV")).toBe(true);
    expect(ekstensiImporDidukung("data.xlsx")).toBe(true);
    expect(ekstensiImporDidukung("data.xls")).toBe(false);
    expect(ekstensiImporDidukung("data.pdf")).toBe(false);
  });

  it("membaca CSV dari buffer", async () => {
    const tabel = await bacaTabelImpor(Buffer.from("NIK,Nama\n320101,Ani"), "warga.csv");
    expect(tabel[1]).toEqual(["320101", "Ani"]);
  });
});

describe("petakanKolom", () => {
  it("memetakan header, alias, dan mengabaikan header tak dikenal", () => {
    const hasil = petakanKolom(
      [
        ["no_ktp", "Nama", "Kolom Aneh"],
        ["3201012001000001", "Ani", "x"],
      ],
      KOLOM,
    );

    expect(hasil.baris).toEqual([
      {
        baris: 1,
        nilai: { nik: "3201012001000001", nama: "Ani", noHp: "" },
        tambahan: { "Kolom Aneh": "x" },
      },
    ]);
    expect(hasil.headerTakDikenal).toEqual(["Kolom Aneh"]);
    expect(hasil.galat).toEqual([]);
  });

  it("mengumpulkan kolom tak dikenal sebagai tambahan per baris", () => {
    const hasil = petakanKolom(
      [
        ["NIK", "Nama", "Disabilitas", "Jenis Bantuan"],
        ["320101", "Ani", "Penglihatan", ""],
      ],
      KOLOM,
    );

    // Kolom tak dikenal yang kosong tidak ikut dikirim sebagai isian.
    expect(hasil.baris[0]?.tambahan).toEqual({ Disabilitas: "Penglihatan" });
  });

  it("melaporkan kolom wajib yang kosong dan melewati baris kosong", () => {
    const hasil = petakanKolom(
      [
        ["NIK", "Nama"],
        ["", "Ani"],
        ["", ""],
        ["320101", "Budi"],
      ],
      KOLOM,
    );

    expect(hasil.baris).toEqual([
      { baris: 3, nilai: { nik: "320101", nama: "Budi", noHp: "" }, tambahan: {} },
    ]);
    expect(hasil.galat).toEqual([{ baris: 1, pesan: "Kolom wajib kosong: NIK." }]);
  });

  it("menolak header yang tidak dikenali sama sekali", () => {
    const hasil = petakanKolom(
      [
        ["A", "B"],
        ["1", "2"],
      ],
      KOLOM,
    );
    expect(hasil.baris).toEqual([]);
    expect(hasil.galat[0]?.pesan).toContain("Header tidak dikenali");
  });

  it("melaporkan berkas kosong", () => {
    expect(petakanKolom([], KOLOM).galat).toEqual([{ baris: 0, pesan: "Berkas kosong." }]);
  });
});

describe("template & sel CSV", () => {
  it("mengutip sel yang memuat pemisah atau tanda kutip", () => {
    expect(selCsv('Budi, S."T"')).toBe('"Budi, S.""T"""');
    expect(selCsv("Ani")).toBe("Ani");
    expect(selCsv(null)).toBe("");
  });

  it("menyusun template dari label kolom", () => {
    expect(templateCsv(KOLOM)).toBe("\uFEFFNIK,Nama,No. HP\r\n");
  });
});

describe("bacaTabelXlsx", () => {
  // Impor exceljs lambat; beri ruang agar tidak timeout saat seluruh suite jalan paralel.
  it("membaca sheet pertama beserta sel kosong di tengah", { timeout: 30_000 }, async () => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");
    sheet.addRow(["NIK", "Nama", "No. HP"]);
    sheet.addRow(["320101", "Ani", ""]);
    sheet.addRow(["320102", "Budi", "0812"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const tabel = await bacaTabelImpor(buffer, "warga.xlsx");

    expect(tabel[0]).toEqual(["NIK", "Nama", "No. HP"]);
    expect(tabel[1]).toEqual(["320101", "Ani", ""]);
    expect(tabel[2]).toEqual(["320102", "Budi", "0812"]);
  });

  it("mengubah sel tanggal menjadi ISO YYYY-MM-DD", { timeout: 30_000 }, async () => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");
    sheet.addRow(["NIK", "Lahir"]);
    sheet.addRow(["320101", new Date("1990-05-01T00:00:00.000Z")]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const tabel = await bacaTabelImpor(buffer, "tanggal.xlsx");

    expect(tabel[1]?.[1]).toBe("1990-05-01");
  });
});
