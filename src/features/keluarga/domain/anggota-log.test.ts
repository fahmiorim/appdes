import { describe, expect, it } from "vitest";

import { bedakanPerubahanAnggota, type AnggotaSnapshot } from "./keluarga";

/** Snapshot ringkas agar test mudah dibaca. */
function anggota(familyId: number | null, relationId: number | null): AnggotaSnapshot {
  return { familyId, familyRelationId: relationId };
}

describe("bedakanPerubahanAnggota", () => {
  it("tidak mencatat apa pun bila keduanya tanpa KK", () => {
    expect(bedakanPerubahanAnggota(null, null)).toEqual([]);
    expect(bedakanPerubahanAnggota(anggota(null, null), anggota(null, 3))).toEqual([]);
  });

  it("mencatat penambahan saat penduduk mulai masuk sebuah KK", () => {
    expect(bedakanPerubahanAnggota(null, anggota(7, 3))).toEqual([
      { familyId: 7, aksi: "added", relationId: 3 },
    ]);
  });

  it("mencatat pengeluaran saat penduduk dilepas dari KK", () => {
    expect(bedakanPerubahanAnggota(anggota(7, 3), anggota(null, null))).toEqual([
      { familyId: 7, aksi: "removed", relationId: null },
    ]);
  });

  it("mencatat perubahan hubungan bila KK-nya sama", () => {
    expect(bedakanPerubahanAnggota(anggota(7, 2), anggota(7, 1))).toEqual([
      { familyId: 7, aksi: "role_changed", relationId: 1 },
    ]);
  });

  it("menambahkan hubungan pada KK yang sama tetap dihitung sebagai perubahan hubungan", () => {
    expect(bedakanPerubahanAnggota(anggota(7, null), anggota(7, 2))).toEqual([
      { familyId: 7, aksi: "role_changed", relationId: 2 },
    ]);
  });

  it("tidak mencatat apa pun bila tidak ada yang berubah", () => {
    expect(bedakanPerubahanAnggota(anggota(7, 2), anggota(7, 2))).toEqual([]);
  });

  it("pindah KK menghasilkan dua catatan: keluar lalu masuk", () => {
    expect(bedakanPerubahanAnggota(anggota(7, 2), anggota(9, 1))).toEqual([
      { familyId: 7, aksi: "removed", relationId: null },
      { familyId: 9, aksi: "added", relationId: 1 },
    ]);
  });
});
