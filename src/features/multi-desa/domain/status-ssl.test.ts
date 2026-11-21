import { describe, expect, it } from "vitest";

import {
  BATAS_SEGERA_KEDALUWARSA_HARI,
  hariMenujuKedaluwarsaSsl,
  klasifikasiSsl,
} from "./status-ssl";

const SEKARANG = new Date("2026-11-20T00:00:00.000Z");
const HARI = 24 * 60 * 60 * 1000;

function tanggal(hari: number): Date {
  return new Date(SEKARANG.getTime() + hari * HARI);
}

describe("klasifikasiSsl", () => {
  it("menandai sertifikat valid yang masih lama sebagai aktif", () => {
    expect(
      klasifikasiSsl({
        authorized: true,
        validTo: tanggal(BATAS_SEGERA_KEDALUWARSA_HARI + 1),
        sekarang: SEKARANG,
      }),
    ).toBe("aktif");
  });

  it("menandai sertifikat yang kedaluwarsa dalam 30 hari sebagai segera expired", () => {
    expect(
      klasifikasiSsl({
        authorized: true,
        validTo: tanggal(BATAS_SEGERA_KEDALUWARSA_HARI),
        sekarang: SEKARANG,
      }),
    ).toBe("segera-expired");
  });

  it("menandai sertifikat yang sudah lewat sebagai bermasalah", () => {
    expect(klasifikasiSsl({ authorized: true, validTo: tanggal(-1), sekarang: SEKARANG })).toBe(
      "bermasalah",
    );
  });

  it("menandai sertifikat yang gagal diverifikasi atau tanpa tanggal sebagai bermasalah", () => {
    expect(klasifikasiSsl({ authorized: false, validTo: tanggal(100), sekarang: SEKARANG })).toBe(
      "bermasalah",
    );
    expect(klasifikasiSsl({ authorized: true, validTo: null, sekarang: SEKARANG })).toBe(
      "bermasalah",
    );
  });

  it("mengutamakan error handshake sebagai bermasalah", () => {
    expect(
      klasifikasiSsl({
        authorized: true,
        validTo: tanggal(100),
        sekarang: SEKARANG,
        error: "Sertifikat kedaluwarsa.",
      }),
    ).toBe("bermasalah");
  });
});

describe("hariMenujuKedaluwarsaSsl", () => {
  it("menghitung sisa hari dan nilai negatif untuk sertifikat lewat", () => {
    expect(hariMenujuKedaluwarsaSsl(tanggal(10), SEKARANG)).toBe(10);
    expect(hariMenujuKedaluwarsaSsl(tanggal(-3), SEKARANG)).toBe(-3);
    expect(hariMenujuKedaluwarsaSsl(null, SEKARANG)).toBeNull();
  });
});
