import { describe, expect, it } from "vitest";

import { hitungStatistikPengguna } from "./statistik-pengguna";

describe("hitungStatistikPengguna", () => {
  it("menghitung total, aktif, nonaktif, dan anggota per role", () => {
    const hasil = hitungStatistikPengguna([
      { active: true, roleId: 1 },
      { active: true, roleId: 1 },
      { active: false, roleId: 2 },
      { active: true, roleId: null },
    ]);

    expect(hasil).toEqual({
      total: 4,
      aktif: 3,
      nonaktif: 1,
      perRole: { 1: 2, 2: 1 },
    });
  });

  it("mengembalikan nol untuk daftar kosong tanpa role palsu", () => {
    expect(hitungStatistikPengguna([])).toEqual({
      total: 0,
      aktif: 0,
      nonaktif: 0,
      perRole: {},
    });
  });
});
