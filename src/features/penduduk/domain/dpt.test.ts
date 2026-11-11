import { describe, expect, it } from "vitest";

import {
  buildDptCsv,
  buildDptRekapCsv,
  DPT_TANPA_DUSUN,
  dptFilename,
  dptRekapFilename,
  hitungRekapDpt,
  keDptPublik,
  type DptRow,
} from "./dpt";

/** Satu baris DPT uji dengan nilai bawaan yang wajar. */
function baris(overrides: Partial<DptRow> = {}): DptRow {
  return {
    id: 1,
    nationalId: "3201012001000001",
    name: "Ani",
    gender: "female",
    birthDate: "1990-01-01",
    dusun: "Sukamaju",
    rw: "01",
    rt: "02",
    agama: "Islam",
    pendidikan: "SMA",
    pekerjaan: "Petani",
    statusKawin: "Kawin",
    umurPemilihan: 34,
    ...overrides,
  };
}

describe("buildDptCsv", () => {
  it("menulis kop, header, dan baris data", () => {
    const csv = buildDptCsv({
      namaDesa: "Sukamaju",
      judulPemilihan: "Pemilihan Kepala Desa 2026",
      tanggalPemilihan: "2026-06-01",
      rows: [baris()],
    });

    const barisCsv = csv.split("\r\n");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(barisCsv[0]).toContain("Daftar Pemilih Tetap");
    expect(barisCsv[1]).toContain("Sukamaju");
    expect(csv).toContain("Perempuan");
    expect(csv).toContain("Sukamaju");
  });

  it("memakai tanda hubung untuk nilai kosong", () => {
    const csv = buildDptCsv({
      namaDesa: null,
      judulPemilihan: "Pemilihan",
      tanggalPemilihan: "2026-06-01",
      rows: [baris({ nationalId: null, birthDate: null, umurPemilihan: null, agama: null })],
    });

    expect(csv).toContain("1;-;Ani;Perempuan;-;-;Sukamaju;01;02;");
  });
});

describe("keDptPublik", () => {
  it("membuang NIK, tanggal lahir, dan atribut pribadi lain", () => {
    const publik = keDptPublik(baris());

    expect(publik).toEqual({
      id: 1,
      name: "Ani",
      gender: "female",
      umurPemilihan: 34,
      dusun: "Sukamaju",
      rw: "01",
      rt: "02",
    });
    expect(Object.keys(publik)).not.toContain("nationalId");
    expect(Object.keys(publik)).not.toContain("birthDate");
  });
});

describe("hitungRekapDpt", () => {
  const rows = [
    { dusun: "Sukamaju", gender: "male" as const },
    { dusun: "Sukamaju", gender: "female" as const },
    { dusun: "Sukamaju", gender: "female" as const },
    { dusun: "Mekarsari", gender: "male" as const },
    { dusun: null, gender: "male" as const },
  ];

  it("mengelompokkan pemilih per dusun dan menghitung jenis kelamin", () => {
    const rekap = hitungRekapDpt(rows);

    expect(rekap.rows).toEqual([
      { label: DPT_TANPA_DUSUN, total: 1, male: 1, female: 0, percentage: 20 },
      { label: "Mekarsari", total: 1, male: 1, female: 0, percentage: 20 },
      { label: "Sukamaju", total: 3, male: 1, female: 2, percentage: 60 },
    ]);
    expect(rekap.total).toBe(5);
    expect(rekap.male).toBe(3);
    expect(rekap.female).toBe(2);
  });

  it("mengembalikan rekap kosong bila tidak ada pemilih", () => {
    expect(hitungRekapDpt([])).toEqual({ rows: [], total: 0, male: 0, female: 0 });
  });

  it("menggabungkan dusun yang hanya berbeda spasi", () => {
    const rekap = hitungRekapDpt([
      { dusun: "Sukamaju", gender: "male" },
      { dusun: " Sukamaju ", gender: "female" },
      { dusun: "   ", gender: "male" },
    ]);

    expect(rekap.rows.map((row) => row.label)).toEqual([DPT_TANPA_DUSUN, "Sukamaju"]);
    expect(rekap.rows[1]?.total).toBe(2);
  });
});

describe("buildDptRekapCsv", () => {
  it("menutup tabel dengan baris jumlah", () => {
    const csv = buildDptRekapCsv({
      namaDesa: "Sukamaju",
      judulPemilihan: "Pemilihan Kepala Desa 2026",
      tanggalPemilihan: "2026-06-01",
      rekap: hitungRekapDpt([
        { dusun: "Sukamaju", gender: "male" },
        { dusun: "Mekarsari", gender: "female" },
      ]),
    });

    expect(csv).toContain("Rekapitulasi Daftar Pemilih Tetap");
    expect(csv.trimEnd().endsWith(";JUMLAH;1;1;2;100%")).toBe(true);
  });
});

describe("nama berkas", () => {
  it("menyusun nama berkas yang aman", () => {
    expect(dptFilename("Sukamaju", "Pemilihan Kepala Desa 2026")).toBe(
      "dpt-sukamaju-pemilihan-kepala-desa-2026.csv",
    );
    expect(dptRekapFilename(null, "")).toBe("rekap-dpt-desa.csv");
  });
});
