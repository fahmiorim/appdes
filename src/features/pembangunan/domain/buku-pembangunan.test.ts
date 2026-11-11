import { describe, expect, it } from "vitest";

import {
  angkaAnggaran,
  buildBukuPembangunan,
  buildBukuPembangunanCsv,
  namaBerkasBukuPembangunan,
  totalBukuPembangunan,
} from "./buku-pembangunan";
import type { PembangunanProyekDTO } from "./pembangunan";

function proyek(overrides: Partial<PembangunanProyekDTO> = {}): PembangunanProyekDTO {
  return {
    id: 1,
    judul: "Normalisasi Saluran",
    slug: "normalisasi-saluran",
    deskripsi: null,
    lokasi: "Dusun Krajan",
    tahunAnggaran: 2026,
    sumberDana: "Dana Desa",
    anggaran: "1500000.00",
    volume: "200",
    satuan: "meter",
    pelaksana: "TPK Desa",
    mulai: "2026-03-01",
    selesai: null,
    status: "berjalan",
    progres: 40,
    hasil: null,
    ...overrides,
  };
}

describe("angkaAnggaran", () => {
  it("mengubah teks desimal menjadi angka dan nilai kosong menjadi 0", () => {
    expect(angkaAnggaran("1500000.00")).toBe(1500000);
    expect(angkaAnggaran(null)).toBe(0);
    expect(angkaAnggaran("bukan angka")).toBe(0);
  });
});

describe("buildBukuPembangunan", () => {
  it("mengelompokkan proyek per tahun dan menghitung status", () => {
    const buku = buildBukuPembangunan([
      proyek({ id: 1, judul: "B", anggaran: "1000.00", progres: 50 }),
      proyek({ id: 2, judul: "A", status: "selesai", anggaran: "500.00", progres: 100 }),
      proyek({ id: 3, judul: "C", tahunAnggaran: 2025, status: "rencana", anggaran: null }),
    ]);

    expect(buku.map((item) => item.tahun)).toEqual([2026, 2025]);
    expect(buku[0]?.jumlahProyek).toBe(2);
    expect(buku[0]?.selesai).toBe(1);
    expect(buku[0]?.berjalan).toBe(1);
    expect(buku[0]?.totalAnggaran).toBe(1500);
    expect(buku[0]?.progresRataRata).toBe(75);
    expect(buku[0]?.proyek.map((item) => item.judul)).toEqual(["A", "B"]);
    expect(buku[1]?.totalAnggaran).toBe(0);
  });

  it("mengembalikan daftar kosong untuk data kosong", () => {
    expect(buildBukuPembangunan([])).toEqual([]);
  });
});

describe("totalBukuPembangunan", () => {
  it("menjumlahkan seluruh tahun dan menimbang progres per jumlah proyek", () => {
    const buku = buildBukuPembangunan([
      proyek({ id: 1, progres: 100 }),
      proyek({ id: 2, tahunAnggaran: 2025, progres: 0 }),
    ]);
    const total = totalBukuPembangunan(buku);

    expect(total.jumlahProyek).toBe(2);
    expect(total.totalAnggaran).toBe(3000000);
    expect(total.progresRataRata).toBe(50);
  });

  it("aman saat tidak ada baris", () => {
    expect(totalBukuPembangunan([])).toEqual({
      jumlahProyek: 0,
      totalAnggaran: 0,
      progresRataRata: 0,
      selesai: 0,
    });
  });
});

describe("buildBukuPembangunanCsv", () => {
  it("memuat rekap, total, dan rincian proyek", () => {
    const csv = buildBukuPembangunanCsv(buildBukuPembangunan([proyek()]));

    expect(csv).toContain("BUKU PEMBANGUNAN DESA");
    expect(csv).toContain("Normalisasi Saluran");
    expect(csv).toContain("Berjalan");
    expect(csv).toContain("TOTAL");
    expect(csv).not.toContain("null");
  });

  it("mengutip judul yang memuat koma", () => {
    const csv = buildBukuPembangunanCsv(
      buildBukuPembangunan([proyek({ judul: "Jalan, Jembatan, dan Drainase" })]),
    );

    expect(csv).toContain('"Jalan, Jembatan, dan Drainase"');
  });
});

describe("namaBerkasBukuPembangunan", () => {
  it("menyertakan tahun hanya bila difilter", () => {
    expect(namaBerkasBukuPembangunan(null)).toBe("buku-pembangunan.csv");
    expect(namaBerkasBukuPembangunan(2026)).toBe("buku-pembangunan-2026.csv");
  });
});
