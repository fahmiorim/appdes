import { describe, expect, it } from "vitest";

import { kelompokkanAnggotaPublik, type AnggotaPublikRow } from "./anggota-publik";

function baris(overrides: Partial<AnggotaPublikRow>): AnggotaPublikRow {
  return {
    kelompokId: 1,
    kelompokNama: "Karang Taruna",
    kelompokTipe: "kelompok",
    kategoriNama: "Kepemudaan",
    nama: "Budi",
    position: 90,
    memberNumber: null,
    ...overrides,
  };
}

describe("kelompokkanAnggotaPublik", () => {
  it("mengelompokkan anggota dan mengurutkan jabatan lalu nama", () => {
    const hasil = kelompokkanAnggotaPublik([
      baris({ nama: "Sari", position: 90 }),
      baris({ nama: "Andi", position: 1, memberNumber: "A-001" }),
      baris({ nama: "Budi", position: 90 }),
      baris({ kelompokId: 2, kelompokNama: "PKK", kelompokTipe: "lembaga", nama: "Rina" }),
    ]);

    expect(hasil.map((item) => item.kelompokNama)).toEqual(["Karang Taruna", "PKK"]);
    expect(hasil[0]?.anggota.map((item) => item.nama)).toEqual(["Andi", "Budi", "Sari"]);
    expect(hasil[0]?.anggota[0]).toEqual({
      nama: "Andi",
      jabatan: "Ketua",
      nomorAnggota: "A-001",
    });
    expect(hasil[1]?.anggota).toHaveLength(1);
  });

  it("mengembalikan daftar kosong bila tidak ada anggota publik", () => {
    expect(kelompokkanAnggotaPublik([])).toEqual([]);
  });

  it("hanya membawa kolom aman (tanpa NIK)", () => {
    const [grup] = kelompokkanAnggotaPublik([baris({})]);
    const anggota = grup?.anggota[0];

    expect(anggota).toBeDefined();
    expect(Object.keys(anggota ?? {})).toEqual(["nama", "jabatan", "nomorAnggota"]);
  });
});
