import { describe, expect, it } from "vitest";

import { lapakFormSchema } from "./lapak";

function masukanLapak(ubah: Partial<Record<string, unknown>> = {}) {
  return {
    nama: "  Keripik Pisang Bu Ani  ",
    pemilik: "Ani",
    kategori: "Makanan",
    alamat: "RT 02",
    keterangan: "",
    ...ubah,
  };
}

describe("validasi lapak", () => {
  it("memangkas spasi nama dan mengubah kolom kosong menjadi null", () => {
    const hasil = lapakFormSchema.parse(masukanLapak({ pemilik: "", alamat: "" }));

    expect(hasil.nama).toBe("Keripik Pisang Bu Ani");
    expect(hasil.pemilik).toBeNull();
    expect(hasil.alamat).toBeNull();
    expect(hasil.keterangan).toBeNull();
  });

  it("mewajibkan nama", () => {
    expect(lapakFormSchema.safeParse(masukanLapak({ nama: "  " })).success).toBe(false);
  });

  it("membatasi nama maksimal 200 karakter", () => {
    expect(lapakFormSchema.safeParse(masukanLapak({ nama: "a".repeat(200) })).success).toBe(true);
    expect(lapakFormSchema.safeParse(masukanLapak({ nama: "a".repeat(201) })).success).toBe(false);
  });

  it("mengizinkan lapak tanpa pemilik/kategori/alamat", () => {
    const hasil = lapakFormSchema.parse(
      masukanLapak({ pemilik: undefined, kategori: undefined, alamat: undefined }),
    );

    expect(hasil.pemilik).toBeUndefined();
    expect(hasil.kategori).toBeUndefined();
  });
});
