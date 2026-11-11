import { describe, expect, it } from "vitest";

import {
  checkboxAktif,
  parsePengaturan,
  PENGATURAN_DEFAULT,
  pengaturanSchema,
  serialisasiPengaturan,
} from "./pengaturan";

describe("pengaturan domain", () => {
  it("memakai bawaan saat belum ada baris", () => {
    expect(parsePengaturan([])).toEqual(PENGATURAN_DEFAULT);
    expect(PENGATURAN_DEFAULT).toEqual({
      komentarAktif: true,
      beritaBeranda: 5,
      pendaftaranWargaAktif: true,
      penomoranSurat: 2,
    });
  });

  it("menerapkan override valid dan mengabaikan kunci asing", () => {
    const hasil = parsePengaturan([
      { kunci: "web.komentar_aktif", nilai: "false" },
      { kunci: "web.berita_beranda", nilai: "9" },
      { kunci: "surat.penomoran_mode", nilai: "3" },
      { kunci: "tidak.dikenal", nilai: "true" },
    ]);

    expect(hasil.komentarAktif).toBe(false);
    expect(hasil.beritaBeranda).toBe(9);
    expect(hasil.penomoranSurat).toBe(3);
    expect(hasil.pendaftaranWargaAktif).toBe(true);
  });

  it("mengabaikan JSON rusak dan nilai di luar batas", () => {
    const hasil = parsePengaturan([
      { kunci: "web.berita_beranda", nilai: "bukan-json" },
      { kunci: "mandiri.pendaftaran_warga", nilai: null },
    ]);

    expect(hasil.beritaBeranda).toBe(5);
    expect(hasil.pendaftaranWargaAktif).toBe(true);
  });

  it("bolak-balik serialisasi tetap sama", () => {
    const nilai = {
      komentarAktif: false,
      beritaBeranda: 8,
      pendaftaranWargaAktif: false,
      penomoranSurat: 4,
    };

    expect(parsePengaturan(serialisasiPengaturan(nilai))).toEqual(nilai);
  });

  it("menolak angka di luar batas pada skema", () => {
    expect(pengaturanSchema.safeParse({ beritaBeranda: 0 }).success).toBe(false);
    expect(pengaturanSchema.safeParse({ beritaBeranda: 13 }).success).toBe(false);
    expect(pengaturanSchema.safeParse({ beritaBeranda: "7" }).success).toBe(true);
    expect(pengaturanSchema.safeParse({ penomoranSurat: 0 }).success).toBe(false);
    expect(pengaturanSchema.safeParse({ penomoranSurat: 5 }).success).toBe(false);
    expect(pengaturanSchema.safeParse({ penomoranSurat: "3" }).success).toBe(true);
  });

  it("menafsirkan checkbox form", () => {
    expect(checkboxAktif("on")).toBe(true);
    expect(checkboxAktif("TRUE")).toBe(true);
    expect(checkboxAktif("1")).toBe(true);
    expect(checkboxAktif("off")).toBe(false);
    expect(checkboxAktif(null)).toBe(false);
  });
});
