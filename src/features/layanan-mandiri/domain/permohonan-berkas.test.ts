import { describe, expect, it } from "vitest";

import type { PermohonanAdminRow } from "./layanan-mandiri";
import {
  buildPermohonanCsv,
  namaBerkasPermohonan,
  ringkasPermohonanPerJenis,
  saringPermohonan,
} from "./permohonan-berkas";

function row(overrides: Partial<PermohonanAdminRow>): PermohonanAdminRow {
  return {
    id: 1,
    idPemohon: 10,
    idSurat: 1,
    letterId: null,
    status: 1,
    alasan: null,
    keterangan: null,
    noAntrian: "AN-1",
    syarat: null,
    isianForm: null,
    noHpAktif: null,
    createdAt: new Date("2026-10-05T00:00:00.000Z"),
    namaSurat: "Surat Keterangan",
    formIsian: null,
    namaPemohon: "Budi",
    nikPemohon: "3201010101010001",
    letterNumber: null,
    ...overrides,
  };
}

describe("saringPermohonan", () => {
  const rows = [
    row({ id: 1, createdAt: new Date("2026-10-01T00:00:00.000Z"), status: 1, idSurat: 1 }),
    row({
      id: 2,
      createdAt: new Date("2026-10-10T00:00:00.000Z"),
      status: 3,
      idSurat: 2,
      namaSurat: "Surat Domisili",
    }),
    row({ id: 3, createdAt: null, status: 5, idSurat: 1 }),
  ];

  it("menyaring rentang tanggal inklusif", () => {
    const hasil = saringPermohonan(rows, { dari: "2026-10-01", sampai: "2026-10-05" });
    expect(hasil.map((item) => item.id)).toEqual([1]);
  });

  it("menyaring jenis dan status", () => {
    expect(saringPermohonan(rows, { typeId: 1 }).map((item) => item.id)).toEqual([1, 3]);
    expect(saringPermohonan(rows, { status: 3 }).map((item) => item.id)).toEqual([2]);
  });

  it("membuang baris tanpa tanggal saat filter tanggal aktif", () => {
    expect(saringPermohonan(rows, { dari: "2026-01-01" }).map((item) => item.id)).toEqual([1, 2]);
  });

  it("tanpa filter mengembalikan semua baris", () => {
    expect(saringPermohonan(rows, {})).toHaveLength(3);
  });
});

describe("ringkasPermohonanPerJenis", () => {
  it("menghitung menunggu/selesai/dibatalkan per jenis", () => {
    const rekap = ringkasPermohonanPerJenis([
      row({ id: 1, idSurat: 1, namaSurat: "Surat Keterangan", status: 1 }),
      row({ id: 2, idSurat: 1, namaSurat: "Surat Keterangan", status: 3 }),
      row({ id: 3, idSurat: 1, namaSurat: "Surat Keterangan", status: 5 }),
      row({ id: 4, idSurat: 2, namaSurat: "Surat Domisili", status: 2 }),
    ]);

    expect(rekap).toEqual([
      { jenis: "Surat Keterangan", total: 3, menunggu: 1, selesai: 1, dibatalkan: 1 },
      { jenis: "Surat Domisili", total: 1, menunggu: 1, selesai: 0, dibatalkan: 0 },
    ]);
  });

  it("menggabungkan jenis kosong menjadi label umum", () => {
    const rekap = ringkasPermohonanPerJenis([row({ namaSurat: null })]);
    expect(rekap[0]?.jenis).toBe("Jenis tidak diketahui");
  });
});

describe("buildPermohonanCsv", () => {
  it("menulis metadata, header, dan status yang terbaca", () => {
    const csv = buildPermohonanCsv({
      namaDesa: "Sukamaju",
      filter: "Jenis Surat Keterangan",
      rows: [row({ letterNumber: "001/SK/2026", alasan: "Dokumen kurang" })],
    });

    expect(csv).toContain("Rekap Permohonan Surat");
    expect(csv).toContain("Filter: Jenis Surat Keterangan");
    expect(csv).toContain("No. Antrian,Tanggal,Pemohon");
    expect(csv).toContain("AN-1,2026-10-05,Budi,3201010101010001");
    expect(csv).toContain("Sedang Diperiksa");
  });

  it("mengutip nilai yang memuat koma", () => {
    const csv = buildPermohonanCsv({
      namaDesa: null,
      rows: [row({ alasan: "Kurang, lengkap" })],
    });
    expect(csv).toContain('"Kurang, lengkap"');
  });
});

describe("namaBerkasPermohonan", () => {
  it("membuat slug aman", () => {
    expect(namaBerkasPermohonan("Desa Sukamaju")).toBe("rekap-permohonan-surat-desa-sukamaju.csv");
  });
});
