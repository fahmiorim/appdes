import { describe, expect, it } from "vitest";

import { petakanKolom } from "@/lib/spreadsheet";

import {
  buildDtksCsv,
  buildDtksRekapCsv,
  DTKS_TANPA_DUSUN,
  dtksFilename,
  dtksRekapFilename,
  hitungRekapDtks,
  KOLOM_IMPOR_DTKS,
  rencanaImporDtks,
  templateImporDtks,
  type BarisImporDtks,
  type DtksEksporRow,
} from "./dtks-berkas";

/** Baris DTKS uji dengan nilai bawaan yang wajar. */
function baris(overrides: Partial<DtksEksporRow> = {}): DtksEksporRow {
  return {
    id: 1,
    noRtm: "32010100001",
    kepalaRtm: "Budi",
    status: "draf",
    jumlahAnggota: 3,
    dusun: "Sukamaju",
    namaPetugas: "Petugas A",
    namaResponden: "Budi",
    tanggalPencacahan: "2026-01-15",
    namaKk: "3201012001000001",
    ...overrides,
  };
}

describe("kolom impor DTKS", () => {
  it("membaca header sesuai template", () => {
    const hasil = petakanKolom(
      [
        ["No. RTM", "Nama Responden", "Nama Petugas", "Tanggal Pencacahan"],
        ["32010100001", "Budi", "Petugas A", "2026-01-15"],
      ],
      KOLOM_IMPOR_DTKS,
    );

    expect(hasil.baris).toEqual([
      {
        baris: 1,
        nilai: {
          noRtm: "32010100001",
          namaResponden: "Budi",
          namaPetugas: "Petugas A",
          tanggalPencacahan: "2026-01-15",
        },
        tambahan: {},
      },
    ]);
    expect(hasil.galat).toEqual([]);
  });

  it("menerima alias header dan menolak baris tanpa nomor RTM", () => {
    const hasil = petakanKolom(
      [
        ["nomor rtm", "responden"],
        ["32010100002", "Ani"],
        ["", "Tono"],
      ],
      KOLOM_IMPOR_DTKS,
    );

    expect(hasil.baris).toHaveLength(1);
    expect(hasil.baris[0]?.nilai.namaResponden).toBe("Ani");
    expect(hasil.galat[0]?.pesan).toContain("No. RTM");
  });

  it("template impor dapat dibaca kembali oleh pemeta kolom", () => {
    const barisTemplate = templateImporDtks()
      .replace(/^\uFEFF/, "")
      .split("\r\n")
      .filter((baris1) => baris1 !== "");
    const hasil = petakanKolom(
      barisTemplate.map((baris1) => baris1.split(",")),
      KOLOM_IMPOR_DTKS,
    );

    expect(hasil.baris).toHaveLength(1);
    expect(hasil.galat).toEqual([]);
  });
});

describe("buildDtksCsv", () => {
  it("menulis kop dan baris data dengan label status", () => {
    const csv = buildDtksCsv({
      namaDesa: "Sukamaju",
      rows: [baris(), baris({ id: 2, noRtm: "32010100002", status: "terverifikasi" })],
    });

    expect(csv).toContain("Data Terpadu Kesejahteraan Sosial (DTKS)");
    expect(csv).toContain("32010100001;Budi;3201012001000001;Sukamaju;Draf;3");
    expect(csv).toContain("Terverifikasi");
  });

  it("menyusun nama berkas yang aman", () => {
    expect(dtksFilename("Sukamaju")).toBe("dtks-sukamaju.csv");
    expect(dtksFilename(null)).toBe("dtks-desa.csv");
  });
});

describe("hitungRekapDtks", () => {
  const rows = [
    baris({ status: "draf", dusun: "Sukamaju", jumlahAnggota: 4 }),
    baris({ id: 2, status: "terverifikasi", dusun: "Sukamaju", jumlahAnggota: 2 }),
    baris({ id: 3, status: "draf", dusun: null, jumlahAnggota: 1 }),
  ];

  it("merekap per status dan per dusun", () => {
    const rekap = hitungRekapDtks(rows);

    expect(rekap.total).toBe(3);
    expect(rekap.totalAnggota).toBe(7);
    expect(rekap.perStatus).toEqual([
      { label: "Draf", jumlah: 2, anggota: 5, percentage: 66.67 },
      { label: "Terverifikasi", jumlah: 1, anggota: 2, percentage: 33.33 },
    ]);
    expect(rekap.perDusun.map((row) => row.label)).toEqual([DTKS_TANPA_DUSUN, "Sukamaju"]);
  });

  it("mengembalikan rekap kosong tanpa data", () => {
    expect(hitungRekapDtks([])).toEqual({
      total: 0,
      totalAnggota: 0,
      perStatus: [],
      perDusun: [],
    });
  });

  it("menulis CSV rekap dengan dua blok", () => {
    const csv = buildDtksRekapCsv({ namaDesa: "Sukamaju", rekap: hitungRekapDtks(rows) });

    expect(csv).toContain("Rekapitulasi DTKS");
    expect(csv).toContain("Menurut Status");
    expect(csv).toContain("Menurut Dusun");
    expect(dtksRekapFilename("Sukamaju")).toBe("rekap-dtks-sukamaju.csv");
  });
});

describe("rencana impor DTKS", () => {
  const peta = new Map([
    ["32010100001", 11],
    ["32010100002", 12],
  ]);

  function impor(overrides: Partial<BarisImporDtks> = {}): BarisImporDtks {
    return {
      noRtm: "32010100001",
      namaResponden: "Budi",
      namaPetugas: "Petugas A",
      tanggalPencacahan: "2026-01-15",
      ...overrides,
    };
  }

  it("memetakan nomor RTM yang ada dan melaporkan yang tidak ditemukan", () => {
    const rencana = rencanaImporDtks(
      [impor(), impor({ noRtm: "999", namaResponden: "Ani" })],
      peta,
    );

    expect(rencana.siap).toEqual([
      {
        noRtm: "32010100001",
        rtmId: 11,
        namaResponden: "Budi",
        namaPetugas: "Petugas A",
        tanggalPencacahan: "2026-01-15",
      },
    ]);
    expect(rencana.tidakDitemukan).toEqual(["999"]);
    expect(rencana.ganda).toEqual([]);
  });

  it("hanya memakai kemunculan pertama untuk nomor RTM ganda", () => {
    const rencana = rencanaImporDtks(
      [impor({ namaResponden: "Budi" }), impor({ namaResponden: "Ani" })],
      peta,
    );

    expect(rencana.siap).toHaveLength(1);
    expect(rencana.siap[0]?.namaResponden).toBe("Budi");
    expect(rencana.ganda).toEqual(["32010100001"]);
  });

  it("menormalkan spasi di sekitar nomor RTM sebelum dicocokkan", () => {
    const rencana = rencanaImporDtks([impor({ noRtm: " 32010100002 " })], peta);

    expect(rencana.siap[0]?.rtmId).toBe(12);
    expect(rencana.siap[0]?.noRtm).toBe("32010100002");
    expect(rencana.tidakDitemukan).toEqual([]);
  });

  it("mengembalikan rencana kosong tanpa baris", () => {
    expect(rencanaImporDtks([], peta)).toEqual({ siap: [], tidakDitemukan: [], ganda: [] });
  });
});
