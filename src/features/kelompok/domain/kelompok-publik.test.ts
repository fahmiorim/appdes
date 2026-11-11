import { describe, expect, it } from "vitest";

import { ringkasAnggotaPublik, type KelompokAnggotaPublik } from "./kelompok";

function anggota(
  id: number,
  name: string,
  position: number,
  memberNumber: string | null = null,
): KelompokAnggotaPublik {
  return { id, name, position, memberNumber };
}

describe("ringkasAnggotaPublik", () => {
  it("menghitung anggota dan mengambil ketua dari jabatan 1", () => {
    const hasil = ringkasAnggotaPublik([
      anggota(1, "Siti", 90),
      anggota(2, "Budi", 1),
      anggota(3, "Andi", 3),
    ]);

    expect(hasil.jumlah).toBe(3);
    expect(hasil.ketua).toBe("Budi");
  });

  it("mengurutkan menurut jabatan lalu nama", () => {
    const hasil = ringkasAnggotaPublik([
      anggota(1, "Zainal", 90),
      anggota(2, "Ani", 90),
      anggota(3, "Dewi", 2),
    ]);

    expect(hasil.anggota.map((item) => item.name)).toEqual(["Dewi", "Ani", "Zainal"]);
  });

  it("mengembalikan ketua null bila tidak ada jabatan ketua", () => {
    const hasil = ringkasAnggotaPublik([anggota(1, "Ani", 90)]);
    expect(hasil.ketua).toBeNull();
  });

  it("menghasilkan nol untuk kelompok tanpa anggota publik", () => {
    const hasil = ringkasAnggotaPublik([]);
    expect(hasil).toEqual({ jumlah: 0, ketua: null, anggota: [] });
  });
});
