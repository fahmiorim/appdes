import { describe, expect, it } from "vitest";

import { MAKS_SHORTCUT, normalisasiShortcut, validasiShortcut } from "./shortcut";

const diizinkan = new Set(["/penduduk", "/keluarga", "/surat", "/inventaris", "/lapak"]);

describe("shortcut domain", () => {
  it("membuang href kosong, duplikat, dan yang tidak diizinkan", () => {
    expect(
      normalisasiShortcut(
        ["/penduduk", " /penduduk ", "", "/tidak-ada", "/surat", "/penduduk"],
        diizinkan,
      ),
    ).toEqual(["/penduduk", "/surat"]);
  });

  it("memotong daftar sesuai batas maksimum", () => {
    const banyak = [
      "/penduduk",
      "/keluarga",
      "/surat",
      "/inventaris",
      "/lapak",
      "/agenda",
      "/galeri",
    ];
    const diizinkanBanyak = new Set(banyak);

    const hasil = normalisasiShortcut(banyak, diizinkanBanyak);
    expect(hasil).toHaveLength(MAKS_SHORTCUT);
    expect(hasil).not.toContain("/galeri");
  });

  it("menolak tujuan di luar menu yang boleh dibaca", () => {
    expect(() => validasiShortcut(["/rahasia"], diizinkan)).toThrow("tidak tersedia");
  });

  it("menolak lebih dari batas maksimum", () => {
    const terlaluBanyak = Array.from({ length: MAKS_SHORTCUT + 1 }, (_, i) => `/menu-${i}`);
    expect(() => validasiShortcut(terlaluBanyak, diizinkan)).toThrow("Maksimal");
  });

  it("menerima input sah dan menghapus duplikat", () => {
    expect(validasiShortcut(["/penduduk", "/penduduk", "/surat"], diizinkan)).toEqual([
      "/penduduk",
      "/surat",
    ]);
  });
});
