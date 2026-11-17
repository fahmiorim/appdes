import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  hapusBerkasEkspor,
  jalurBerkasAman,
  periksaBerkasEkspor,
  pilihKedaluwarsa,
} from "./ekspor-kedaluwarsa.mjs";

/**
 * Aturan tunggal ekspor tenant kedaluwarsa, dipakai repository/use case dan
 * `scripts/platform/cleanup-exports.mjs`. Test ini mengunci batas kedaluwarsa
 * dan penjagaan path supaya kedua jalur tidak menyimpang.
 */

const SEKARANG = new Date("2026-11-18T10:00:00Z");
const JAM = 60 * 60 * 1000;

describe("pilihKedaluwarsa", () => {
  it("mengambil baris yang sudah lewat masa berlaku", () => {
    const baris = [
      { id: 1, kedaluwarsaPada: new Date(SEKARANG.getTime() - JAM) },
      { id: 2, kedaluwarsaPada: new Date(SEKARANG.getTime() + JAM) },
    ];

    expect(pilihKedaluwarsa(baris, SEKARANG).map((item) => item.id)).toEqual([1]);
  });

  it("menghitung waktu yang tepat sama dengan sekarang sebagai kedaluwarsa", () => {
    expect(pilihKedaluwarsa([{ id: 1, kedaluwarsaPada: SEKARANG }], SEKARANG)).toHaveLength(1);
  });

  it("menerima tanggal dalam bentuk string dari driver database", () => {
    const baris = [
      { id: 1, kedaluwarsaPada: "2026-11-17T10:00:00.000Z" },
      { id: 2, kedaluwarsaPada: "2026-11-19T10:00:00.000Z" },
    ];

    expect(pilihKedaluwarsa(baris, SEKARANG).map((item) => item.id)).toEqual([1]);
  });

  it("mengabaikan tanggal yang tidak valid alih-alih menghapusnya", () => {
    expect(pilihKedaluwarsa([{ id: 1, kedaluwarsaPada: "bukan tanggal" }], SEKARANG)).toEqual([]);
  });

  it("mengembalikan daftar kosong untuk masukan kosong", () => {
    expect(pilihKedaluwarsa([], SEKARANG)).toEqual([]);
  });
});

describe("jalurBerkasAman", () => {
  const CWD = path.resolve(path.sep, "srv", "appdes");
  const AKAR = path.join(CWD, "storage", "exports");

  it("menerima berkas di dalam storage/exports", () => {
    expect(jalurBerkasAman(AKAR, "storage/exports/7/2026-01-01.json", CWD)).toBe(
      path.join(AKAR, "7", "2026-01-01.json"),
    );
  });

  it("menolak path absolut di luar folder ekspor", () => {
    expect(jalurBerkasAman(AKAR, path.join(CWD, "src", "db", "schema.ts"), CWD)).toBeNull();
    expect(jalurBerkasAman(AKAR, "storage/media/7/a.png", CWD)).toBeNull();
  });

  it("menolak traversal yang keluar dari folder ekspor", () => {
    expect(jalurBerkasAman(AKAR, "storage/exports/../../src/secrets.env", CWD)).toBeNull();
  });

  it("menolak path yang hanya berawalan sama", () => {
    expect(jalurBerkasAman(AKAR, "storage/exports-lain/7/a.json", CWD)).toBeNull();
  });
});

describe("berkas ekspor kedaluwarsa", () => {
  let cwd = "";
  let akar = "";

  beforeAll(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "appdes-ekspor-aturan-"));
    akar = path.join(cwd, "storage", "exports");
    mkdirSync(path.join(akar, "7"), { recursive: true });
    writeFileSync(path.join(akar, "7", "ada.json"), "{}", "utf8");
    mkdirSync(path.join(cwd, "storage"), { recursive: true });
    writeFileSync(path.join(cwd, "storage", "luar.txt"), "jangan", "utf8");
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  it("menghitung berkas yang akan dihapus tanpa menghapusnya", () => {
    const daftar = [
      { id: 1, berkas: "storage/exports/7/ada.json" },
      { id: 2, berkas: "storage/exports/7/hilang.json" },
      { id: 3, berkas: "storage/luar.txt" },
    ];

    expect(periksaBerkasEkspor(akar, daftar, cwd)).toEqual({
      berkasDihapus: 1,
      berkasTidakAda: 1,
      berkasDilewati: 1,
    });
    expect(existsSync(path.join(akar, "7", "ada.json"))).toBe(true);
  });

  it("menghapus hanya berkas di dalam folder ekspor", async () => {
    const daftar = [
      { id: 1, berkas: "storage/exports/7/ada.json" },
      { id: 2, berkas: "storage/exports/7/hilang.json" },
      { id: 3, berkas: "storage/luar.txt" },
    ];

    await expect(hapusBerkasEkspor(akar, daftar, cwd)).resolves.toEqual({
      berkasDihapus: 1,
      berkasTidakAda: 1,
      berkasDilewati: 1,
    });
    expect(existsSync(path.join(akar, "7", "ada.json"))).toBe(false);
    expect(existsSync(path.join(cwd, "storage", "luar.txt"))).toBe(true);
  });
});
