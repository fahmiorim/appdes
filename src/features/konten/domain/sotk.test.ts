import { describe, expect, it } from "vitest";

import type { PerangkatAdmin } from "./perangkat";
import { namaLengkapPerangkat, susunBaganSotk } from "./sotk";

function perangkat(overrides: Partial<PerangkatAdmin> = {}): PerangkatAdmin {
  return {
    id: 1,
    nama: "Budi",
    gelarDepan: null,
    gelarBelakang: null,
    jabatanId: 1,
    jabatan: "Staf",
    nip: null,
    nik: null,
    jenisKelamin: null,
    tempatLahir: null,
    tanggalLahir: null,
    foto: null,
    penandaTangan: false,
    status: "aktif",
    periode: null,
    urut: 10,
    ...overrides,
  };
}

describe("namaLengkapPerangkat", () => {
  it("menggabungkan gelar depan dan belakang tanpa spasi ganda", () => {
    expect(
      namaLengkapPerangkat(perangkat({ gelarDepan: "H.", nama: "Budi", gelarBelakang: "S.E." })),
    ).toBe("H. Budi S.E.");
  });

  it("mengabaikan gelar kosong", () => {
    expect(namaLengkapPerangkat(perangkat({ gelarDepan: "", gelarBelakang: null }))).toBe("Budi");
  });
});

describe("susunBaganSotk", () => {
  it("menempatkan kepala desa dan sekretaris di puncak bagan", () => {
    const bagan = susunBaganSotk([
      perangkat({ id: 1, nama: "Kades", jabatan: "Kepala Desa", urut: 0 }),
      perangkat({ id: 2, nama: "Sekdes", jabatan: "Sekretaris Desa", urut: 1 }),
      perangkat({ id: 3, nama: "Kaur", jabatan: "Kaur Keuangan", urut: 2 }),
    ]);

    expect(bagan.kepala?.nama).toBe("Kades");
    expect(bagan.sekretaris?.nama).toBe("Sekdes");
    expect(bagan.staf.map((item) => item.nama)).toEqual(["Kaur"]);
    expect(bagan.totalAktif).toBe(3);
  });

  it("mengenali sebutan carik sebagai sekretaris", () => {
    const bagan = susunBaganSotk([perangkat({ id: 1, nama: "Carik", jabatan: "Carik", urut: 1 })]);

    expect(bagan.sekretaris?.nama).toBe("Carik");
  });

  it("mengabaikan perangkat nonaktif", () => {
    const bagan = susunBaganSotk([
      perangkat({ id: 1, nama: "Kades", jabatan: "Kepala Desa", urut: 0 }),
      perangkat({ id: 2, nama: "Mantan", jabatan: "Staf", status: "nonaktif", urut: 1 }),
    ]);

    expect(bagan.totalAktif).toBe(1);
    expect(bagan.staf).toEqual([]);
  });

  it("mengurutkan staf menurut urutan lalu nama", () => {
    const bagan = susunBaganSotk([
      perangkat({ id: 1, nama: "Zaki", jabatan: "Staf", urut: 5 }),
      perangkat({ id: 2, nama: "Ani", jabatan: "Staf", urut: 5 }),
      perangkat({ id: 3, nama: "Cakra", jabatan: "Staf", urut: 2 }),
    ]);

    expect(bagan.staf.map((item) => item.nama)).toEqual(["Cakra", "Ani", "Zaki"]);
  });

  it("mengembalikan bagan kosong saat tidak ada perangkat aktif", () => {
    expect(susunBaganSotk([])).toEqual({
      kepala: null,
      sekretaris: null,
      staf: [],
      totalAktif: 0,
    });
  });
});
