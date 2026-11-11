import { describe, expect, it } from "vitest";

import { lapakProdukFormSchema } from "./lapak-produk";

function masukanProduk(ubah: Partial<Record<string, unknown>> = {}) {
  return {
    nama: "  Keripik Pisang Bu Ani  ",
    harga: "25000",
    stok: "10",
    aktif: true,
    ...ubah,
  };
}

describe("validasi lapak produk", () => {
  it("memangkas spasi nama dan mengubah kolom kosong menjadi null", () => {
    const hasil = lapakProdukFormSchema.parse(masukanProduk({ deskripsi: "", gambar: "" }));

    expect(hasil.nama).toBe("Keripik Pisang Bu Ani");
    expect(hasil.deskripsi).toBeNull();
    expect(hasil.gambar).toBeNull();
    expect(hasil.harga).toBe("25000");
    expect(hasil.stok).toBe("10");
  });

  it("mewajibkan nama", () => {
    expect(lapakProdukFormSchema.safeParse(masukanProduk({ nama: "  " })).success).toBe(false);
  });

  it("mewajibkan harga", () => {
    expect(lapakProdukFormSchema.safeParse(masukanProduk({ harga: "abc" })).success).toBe(false);
    expect(lapakProdukFormSchema.safeParse(masukanProduk({ harga: "" })).success).toBe(true);
  });

  it("mengizinkan produk tanpa deskripsi/gambar/koordinat", () => {
    const hasil = lapakProdukFormSchema.parse(
      masukanProduk({
        deskripsi: undefined,
        gambar: undefined,
        latitude: undefined,
        longitude: undefined,
      }),
    );

    expect(hasil.deskripsi).toBeUndefined();
    expect(hasil.gambar).toBeUndefined();
    expect(hasil.latitude).toBeUndefined();
    expect(hasil.longitude).toBeUndefined();
  });

  it("menerima harga desimal", () => {
    const hasil = lapakProdukFormSchema.parse(masukanProduk({ harga: "15500.50" }));
    expect(hasil.harga).toBe("15500.50");
  });

  it("mewajibkan stok berupa angka bulat", () => {
    expect(lapakProdukFormSchema.safeParse(masukanProduk({ stok: "abc" })).success).toBe(false);
    expect(lapakProdukFormSchema.safeParse(masukanProduk({ stok: "10" })).success).toBe(true);
  });

  it("menerima boolean aktif", () => {
    const aktif = lapakProdukFormSchema.parse(masukanProduk({ aktif: false }));
    expect(aktif.aktif).toBe(false);

    const tidakAktif = lapakProdukFormSchema.parse(masukanProduk({ aktif: true }));
    expect(tidakAktif.aktif).toBe(true);
  });
});
