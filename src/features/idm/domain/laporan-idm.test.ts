import { describe, expect, it } from "vitest";

import type { IdmIndikatorDTO, SdgsDTO } from "./idm";
import { buildLaporanIdmCsv, namaBerkasLaporanIdm } from "./laporan-idm";

function indikator(overrides: Partial<IdmIndikatorDTO> = {}): IdmIndikatorDTO {
  return {
    id: 1,
    villageId: 1,
    tahun: 2026,
    kode: "I.1",
    nama: "Rasio ketergantungan",
    skor: 80,
    kategori: "Sosial",
    keterangan: null,
    ...overrides,
  };
}

function sdgs(overrides: Partial<SdgsDTO> = {}): SdgsDTO {
  return {
    id: 1,
    villageId: 1,
    tahun: 2026,
    goal: 1,
    skor: 90,
    keterangan: "Data Profil Desa",
    ...overrides,
  };
}

describe("buildLaporanIdmCsv", () => {
  it("memuat rekap dimensi, rincian indikator, dan capaian SDGs", () => {
    const csv = buildLaporanIdmCsv({
      tahun: 2026,
      indikator: [indikator()],
      sdgs: [sdgs()],
    });

    expect(csv).toContain("Laporan IDM & SDGs Desa Tahun 2026");
    expect(csv).toContain("Indeks Ketahanan Sosial");
    expect(csv).toContain("Rasio ketergantungan");
    expect(csv).toContain("Desa Tanpa Kemiskinan");
    expect(csv).toContain("Skor IDM");
  });

  it("memakai skor indikator 0–100 dan skor rekap desimal", () => {
    const csv = buildLaporanIdmCsv({ tahun: 2026, indikator: [indikator()], sdgs: [] });

    expect(csv).toContain("I.1,Rasio ketergantungan,Sosial,80,");
    expect(csv).toContain('Indeks Ketahanan Sosial,IKS,1,"0,800"');
  });

  it("menandai status belum ada saat tidak ada indikator", () => {
    const csv = buildLaporanIdmCsv({ tahun: 2026, indikator: [], sdgs: [] });

    expect(csv).toContain("Status,-");
    expect(csv).not.toContain("NaN");
    expect(csv).not.toContain("undefined");
  });

  it("mengutip keterangan yang memuat koma", () => {
    const csv = buildLaporanIdmCsv({
      tahun: 2026,
      indikator: [indikator({ keterangan: "Naik, meski lambat" })],
      sdgs: [],
    });

    expect(csv).toContain('"Naik, meski lambat"');
  });

  it("memakai BOM agar Excel membaca UTF-8", () => {
    expect(buildLaporanIdmCsv({ tahun: 2026, indikator: [], sdgs: [] }).startsWith("\uFEFF")).toBe(
      true,
    );
  });
});

describe("namaBerkasLaporanIdm", () => {
  it("menyertakan tahun", () => {
    expect(namaBerkasLaporanIdm(2026)).toBe("laporan-idm-sdgs-2026.csv");
  });
});
