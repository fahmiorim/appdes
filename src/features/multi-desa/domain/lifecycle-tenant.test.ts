import { describe, expect, it } from "vitest";

import {
  alasanTidakBolehPurge,
  bolehDiekspor,
  hariMenujuPurge,
  kedaluwarsaEkspor,
  MASA_TENGGANG_HARI,
  statusRetensi,
  tanggalBatasPurge,
  type RetensiDesa,
} from "./lifecycle-tenant";

const SEKARANG = new Date("2026-11-17T00:00:00.000Z");
const SEHARI = 24 * 60 * 60 * 1000;

function hariLalu(hari: number): Date {
  return new Date(SEKARANG.getTime() - hari * SEHARI);
}

function desa(overrides: Partial<RetensiDesa> = {}): RetensiDesa {
  return { active: true, nonaktifSejak: null, purgedAt: null, ...overrides };
}

describe("statusRetensi", () => {
  it("menandai desa aktif sebagai aktif", () => {
    expect(statusRetensi(desa(), SEKARANG)).toBe("aktif");
    expect(hariMenujuPurge(desa(), SEKARANG)).toBeNull();
  });

  it("menghitung sisa masa tenggang desa nonaktif", () => {
    const nonaktif = desa({ active: false, nonaktifSejak: hariLalu(30) });

    expect(statusRetensi(nonaktif, SEKARANG)).toBe("masa-tenggang");
    expect(hariMenujuPurge(nonaktif, SEKARANG)).toBe(MASA_TENGGANG_HARI - 30);
  });

  it("menandai desa siap purge setelah 90 hari", () => {
    const siap = desa({ active: false, nonaktifSejak: hariLalu(MASA_TENGGANG_HARI) });

    expect(statusRetensi(siap, SEKARANG)).toBe("siap-purge");
    expect(hariMenujuPurge(siap, SEKARANG)).toBe(0);
  });

  it("desa nonaktif tanpa penanda waktu tetap di masa tenggang", () => {
    expect(statusRetensi(desa({ active: false }), SEKARANG)).toBe("masa-tenggang");
  });

  it("desa yang sudah di-purge tidak kembali dihitung", () => {
    const purged = desa({
      active: false,
      nonaktifSejak: hariLalu(400),
      purgedAt: hariLalu(10),
    });

    expect(statusRetensi(purged, SEKARANG)).toBe("sudah-purge");
    expect(hariMenujuPurge(purged, SEKARANG)).toBeNull();
    expect(bolehDiekspor(purged)).toBe(false);
  });
});

describe("tanggalBatasPurge", () => {
  it("menambahkan masa tenggang 90 hari", () => {
    const mulai = new Date("2026-01-01T00:00:00.000Z");
    expect(tanggalBatasPurge(mulai).toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});

describe("kedaluwarsaEkspor", () => {
  it("berlaku 30 hari sejak dibuat", () => {
    const dibuat = new Date("2026-01-01T00:00:00.000Z");
    expect(kedaluwarsaEkspor(dibuat).toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
});

describe("alasanTidakBolehPurge", () => {
  it("menolak desa aktif", () => {
    expect(alasanTidakBolehPurge(desa(), { adaEksporBerlaku: true, sekarang: SEKARANG })).toMatch(
      /Nonaktifkan desa/,
    );
  });

  it("menolak desa yang belum melewati masa tenggang dan menyebut sisa hari", () => {
    const nonaktif = desa({ active: false, nonaktifSejak: hariLalu(89) });

    expect(alasanTidakBolehPurge(nonaktif, { adaEksporBerlaku: true, sekarang: SEKARANG })).toBe(
      `Masa tenggang belum selesai: 1 hari lagi sebelum data boleh di-purge.`,
    );
  });

  it("menolak bila ekspor belum ada atau kedaluwarsa", () => {
    const siap = desa({ active: false, nonaktifSejak: hariLalu(120) });

    expect(alasanTidakBolehPurge(siap, { adaEksporBerlaku: false, sekarang: SEKARANG })).toMatch(
      /Ekspor data wajib dibuat/,
    );
  });

  it("menolak desa yang sudah di-purge", () => {
    const purged = desa({ active: false, nonaktifSejak: hariLalu(400), purgedAt: hariLalu(1) });

    expect(alasanTidakBolehPurge(purged, { adaEksporBerlaku: true, sekarang: SEKARANG })).toMatch(
      /sudah di-purge/,
    );
  });

  it("menolak desa nonaktif tanpa penanda waktu", () => {
    expect(
      alasanTidakBolehPurge(desa({ active: false }), {
        adaEksporBerlaku: true,
        sekarang: SEKARANG,
      }),
    ).toMatch(/penanda waktu nonaktif/);
  });

  it("meloloskan desa yang memenuhi seluruh syarat", () => {
    const siap = desa({ active: false, nonaktifSejak: hariLalu(120) });

    expect(alasanTidakBolehPurge(siap, { adaEksporBerlaku: true, sekarang: SEKARANG })).toBeNull();
  });
});
