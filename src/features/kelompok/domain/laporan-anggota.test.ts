import { describe, expect, it } from "vitest";

import {
  buildLaporanAnggotaCsv,
  judulLaporanAnggota,
  kelompokkanAnggota,
  namaBerkasLaporanAnggota,
  type AnggotaLaporanRow,
} from "./laporan-anggota";

function baris(overrides: Partial<AnggotaLaporanRow> = {}): AnggotaLaporanRow {
  return {
    kelompokId: 1,
    kelompokNama: "Karang Taruna",
    kelompokTipe: "kelompok",
    kategoriNama: "Kepemudaan",
    nama: "Budi",
    nationalId: "3201010101010001",
    position: 90,
    memberNumber: "KT-01",
    decreeNumber: null,
    ...overrides,
  };
}

describe("kelompokkanAnggota", () => {
  it("mengelompokkan anggota dan mengurutkan jabatan lalu nama", () => {
    const hasil = kelompokkanAnggota([
      baris({ nama: "Zaki", position: 90 }),
      baris({ nama: "Ani", position: 1 }),
      baris({
        kelompokId: 2,
        kelompokNama: "LPM",
        kelompokTipe: "lembaga",
        position: 3,
        nama: "Citra",
      }),
    ]);

    expect(hasil.map((item) => item.kelompokNama)).toEqual(["Karang Taruna", "LPM"]);
    expect(hasil[0]?.anggota.map((item) => item.nama)).toEqual(["Ani", "Zaki"]);
    expect(hasil[1]?.kelompokTipe).toBe("lembaga");
  });

  it("mengembalikan daftar kosong untuk data kosong", () => {
    expect(kelompokkanAnggota([])).toEqual([]);
  });
});

describe("buildLaporanAnggotaCsv", () => {
  it("menulis header dan satu baris per anggota dengan label tipe & jabatan", () => {
    const csv = buildLaporanAnggotaCsv([
      baris({ nama: "Ani", position: 1 }),
      baris({ nama: "Budi", position: 90, nationalId: null }),
    ]);
    const lines = csv
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");

    expect(lines[0]).toBe("Kelompok,Tipe,Kategori,Nama Anggota,NIK,Jabatan,No. Anggota,No. SK");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Ketua");
    expect(lines[2]).toContain("Anggota");
    expect(lines[2]).toContain("Kelompok Masyarakat");
  });

  it("mengosongkan sel NIK yang tidak ada tanpa menulis 'null'", () => {
    const csv = buildLaporanAnggotaCsv([baris({ nationalId: null })]);

    expect(csv).not.toContain("null");
  });

  it("mengutip nilai yang memuat koma", () => {
    const csv = buildLaporanAnggotaCsv([baris({ nama: "Budi, S.E." })]);

    expect(csv).toContain('"Budi, S.E."');
  });
});

describe("judul & nama berkas", () => {
  it("menyesuaikan judul dengan tipe", () => {
    expect(judulLaporanAnggota("lembaga")).toBe("Laporan Anggota Lembaga Desa");
    expect(judulLaporanAnggota("")).toBe("Laporan Anggota Kelompok & Lembaga");
  });

  it("membentuk nama berkas dari tipe", () => {
    expect(namaBerkasLaporanAnggota("kelompok")).toBe("laporan-anggota-kelompok.csv");
    expect(namaBerkasLaporanAnggota("")).toBe("laporan-anggota-kelompok.csv");
  });
});
