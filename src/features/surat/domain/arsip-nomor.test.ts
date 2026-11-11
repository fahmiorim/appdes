import { describe, expect, it } from "vitest";

import {
  ARSIP_PER_HALAMAN,
  buildArsipNomorCsv,
  namaBerkasArsipNomor,
  normalisasiHalaman,
  totalHalaman,
} from "./arsip-nomor";

describe("normalisasiHalaman", () => {
  it("jatuh ke halaman 1 untuk nilai kosong/tidak sah", () => {
    expect(normalisasiHalaman(undefined)).toBe(1);
    expect(normalisasiHalaman("")).toBe(1);
    expect(normalisasiHalaman("0")).toBe(1);
    expect(normalisasiHalaman("-2")).toBe(1);
    expect(normalisasiHalaman("abc")).toBe(1);
  });

  it("membaca halaman valid", () => {
    expect(normalisasiHalaman("3")).toBe(3);
  });
});

describe("totalHalaman", () => {
  it("minimal satu halaman", () => {
    expect(totalHalaman(0)).toBe(1);
    expect(totalHalaman(ARSIP_PER_HALAMAN)).toBe(1);
    expect(totalHalaman(ARSIP_PER_HALAMAN + 1)).toBe(2);
  });
});

describe("buildArsipNomorCsv", () => {
  it("menulis header, metadata, dan baris", () => {
    const csv = buildArsipNomorCsv({
      namaDesa: "Sukamaju",
      filter: "Tahun 2026",
      rows: [
        {
          number: "001/SK/2026",
          typeName: "Surat Keterangan",
          sequence: 1,
          year: 2026,
          issuedAt: new Date("2026-10-05T00:00:00.000Z"),
        },
      ],
    });

    expect(csv).toContain("Arsip Nomor Surat");
    expect(csv).toContain("Filter: Tahun 2026");
    expect(csv).toContain("Nomor Surat,Jenis Surat");
    expect(csv).toContain("001/SK/2026,Surat Keterangan,1,2026,2026-10-05");
  });

  it("mengutip nilai yang memuat koma", () => {
    const csv = buildArsipNomorCsv({
      namaDesa: null,
      rows: [
        {
          number: "002/SK/2026",
          typeName: "Surat Keterangan, Domisili",
          sequence: 2,
          year: 2026,
          issuedAt: new Date("2026-10-06T00:00:00.000Z"),
        },
      ],
    });

    expect(csv).toContain('"Surat Keterangan, Domisili"');
  });
});

describe("namaBerkasArsipNomor", () => {
  it("membuat slug aman", () => {
    expect(namaBerkasArsipNomor("Desa Sukamaju")).toBe("arsip-nomor-surat-desa-sukamaju.csv");
    expect(namaBerkasArsipNomor(null)).toBe("arsip-nomor-surat-desa.csv");
  });
});
