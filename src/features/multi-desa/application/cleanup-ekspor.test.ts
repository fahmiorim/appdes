import path from "node:path";
import { describe, expect, it } from "vitest";

import { jalurBerkasAman, parseArgumen } from "../../../../scripts/platform/cleanup-exports.mjs";

const CWD = path.resolve(path.sep, "srv", "appdes");
const AKAR = path.join(CWD, "storage", "exports");

describe("parseArgumen pembersihan ekspor", () => {
  it("memakai nilai bawaan tanpa argumen", () => {
    expect(parseArgumen([])).toEqual({ dryRun: false, json: false, help: false });
  });

  it("membaca opsi dry-run dan json", () => {
    expect(parseArgumen(["--dry-run", "--json"])).toEqual({
      dryRun: true,
      json: true,
      help: false,
    });
  });

  it("menolak argumen tidak dikenal", () => {
    expect(() => parseArgumen(["--hapus-semua"])).toThrow(/tidak dikenal/);
  });
});

describe("jalurBerkasAman", () => {
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
