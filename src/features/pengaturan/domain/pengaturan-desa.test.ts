import { describe, expect, it } from "vitest";

import { mediaBackupValid } from "./pengaturan-desa";

describe("mediaBackupValid", () => {
  it("menerima path media dengan tenant dan ekstensi yang sesuai", () => {
    expect(mediaBackupValid("7/umum/1730000000000-logo-desa.png", 7, ["png"])).toBe(true);
    expect(mediaBackupValid(null, 7, ["png"])).toBe(true);
  });

  it("menolak media tenant lain dan path yang berpotensi keluar dari folder tenant", () => {
    expect(mediaBackupValid("8/umum/1730000000000-logo-desa.png", 7, ["png"])).toBe(false);
    expect(mediaBackupValid("7/umum/../logo.png", 7, ["png"])).toBe(false);
    expect(mediaBackupValid("7/umum/1730000000000-logo-desa.svg", 7, ["png"])).toBe(false);
  });
});
