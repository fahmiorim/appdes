import { describe, expect, it } from "vitest";

import {
  BUKU_INTI,
  bukuIntiByKode,
  itemBukuFormSchema,
  NOMOR_URUT_MAX,
  nomorUrutBerikutnya,
  URAIAN_ITEM_MAX,
} from "./bumindes";

const itemValid = {
  bukuId: "3",
  nomorUrut: "1",
  tanggal: "2026-10-24",
  uraian: "  Peraturan Desa Nomor 3 Tahun 2026  ",
  keterangan: "  Disahkan di rapat BPD  ",
};

describe("katalog buku inti", () => {
  it("memakai kode unik dan berurutan", () => {
    const kode = BUKU_INTI.map((buku) => buku.kodeBuku);
    expect(new Set(kode).size).toBe(kode.length);
    expect([...kode].sort()).toEqual(kode);
  });

  it("memuat buku inti yang diwajibkan", () => {
    const nama = BUKU_INTI.map((buku) => buku.namaBuku);

    expect(nama).toContain("Buku Peraturan Desa");
    expect(nama).toContain("Buku Inventaris dan Kekayaan Desa");
    expect(nama).toContain("Buku Data Induk Penduduk");
    expect(nama).toContain("Buku KTP dan Kartu Keluarga");
    expect(nama).toContain("Buku Data Mutasi Penduduk");
    expect(nama).toContain("Buku Rekapitulasi Jumlah Penduduk");
    expect(nama).toContain("Buku Tanah Kas Desa");
    expect(nama).toContain("Buku Tanah di Desa");
  });

  it("memetakan kode lama ke buku yang benar, termasuk kode yang dipakai ulang", () => {
    const tanahKas = BUKU_INTI.find((buku) => buku.kodeLama?.kode === "B1");
    const dataInduk = bukuIntiByKode("B1");

    // `B1` lama berarti Tanah Kas Desa; `B1` baru berarti Data Induk Penduduk.
    expect(tanahKas?.kodeBuku).toBe("A5");
    expect(dataInduk?.namaBuku).toBe("Buku Data Induk Penduduk");

    const kodeLama = BUKU_INTI.flatMap((buku) => (buku.kodeLama ? [buku.kodeLama.kode] : []));
    expect(new Set(kodeLama).size).toBe(kodeLama.length);
  });

  it("mencari buku berdasarkan kode", () => {
    expect(bukuIntiByKode("B1")?.namaBuku).toBe("Buku Data Induk Penduduk");
    expect(bukuIntiByKode("ZZ")).toBeNull();
  });
});

describe("itemBukuFormSchema", () => {
  it("menerima isian valid dan memangkas spasi", () => {
    const result = itemBukuFormSchema.parse(itemValid);

    expect(result.bukuId).toBe(3);
    expect(result.nomorUrut).toBe(1);
    expect(result.uraian).toBe("Peraturan Desa Nomor 3 Tahun 2026");
    expect(result.keterangan).toBe("Disahkan di rapat BPD");
  });

  it("mengubah tanggal kosong menjadi null dan mempertahankan keterangan kosong", () => {
    const result = itemBukuFormSchema.parse({ ...itemValid, tanggal: "", keterangan: "" });

    expect(result.tanggal).toBeNull();
    expect(result.keterangan).toBe("");
  });

  it("menolak uraian kosong", () => {
    const result = itemBukuFormSchema.safeParse({ ...itemValid, uraian: "   " });

    expect(result.success).toBe(false);
  });

  it("menolak nomor urut nol, negatif, dan pecahan", () => {
    for (const nomorUrut of ["0", "-1", "1.5"]) {
      const result = itemBukuFormSchema.safeParse({ ...itemValid, nomorUrut });
      expect(result.success).toBe(false);
    }
  });

  it("menolak tanggal yang tidak valid", () => {
    const result = itemBukuFormSchema.safeParse({ ...itemValid, tanggal: "2026-13-40" });

    expect(result.success).toBe(false);
  });

  it("menolak uraian yang melebihi batas kolom", () => {
    const result = itemBukuFormSchema.safeParse({
      ...itemValid,
      uraian: "a".repeat(URAIAN_ITEM_MAX + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("nomorUrutBerikutnya", () => {
  it("memulai dari 1 pada buku kosong", () => {
    expect(nomorUrutBerikutnya([])).toBe(1);
  });

  it("mengambil nomor terbesar + 1, bukan jumlah baris", () => {
    expect(nomorUrutBerikutnya([{ nomorUrut: 1 }, { nomorUrut: 7 }, { nomorUrut: 3 }])).toBe(8);
  });

  it("tidak melewati batas nomor urut", () => {
    expect(nomorUrutBerikutnya([{ nomorUrut: NOMOR_URUT_MAX }])).toBe(NOMOR_URUT_MAX);
  });
});
