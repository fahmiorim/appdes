import { describe, expect, it } from "vitest";

import { parseArgumen } from "../../../../scripts/platform/cleanup-exports.mjs";

/**
 * Parsing argumen CLI penjadwal pembersihan ekspor. Aturan kedaluwarsa dan
 * penjagaan path diuji di `domain/ekspor-kedaluwarsa.test.ts` karena dipakai
 * bersama repository/use case.
 */

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
