import { describe, expect, it } from "vitest";

import { arsipFormSchema } from "./arsip";

function masukanArsip(ubah: Partial<Record<string, unknown>> = {}) {
  return {
    kategori: "Produk Hukum",
    judul: "  Peraturan Desa Nomor 3 Tahun 2025  ",
    berkas: "perdes-3-2025.pdf",
    keterangan: "Arsip fisik di lemari A",
    ...ubah,
  };
}

describe("validasi arsip", () => {
  it("memangkas spasi judul", () => {
    const hasil = arsipFormSchema.parse(masukanArsip());

    expect(hasil.judul).toBe("Peraturan Desa Nomor 3 Tahun 2025");
  });

  it("mewajibkan judul", () => {
    expect(arsipFormSchema.safeParse(masukanArsip({ judul: "   " })).success).toBe(false);
  });

  it("membatasi judul 200 karakter dan kategori 100 karakter", () => {
    expect(arsipFormSchema.safeParse(masukanArsip({ judul: "a".repeat(200) })).success).toBe(true);
    expect(arsipFormSchema.safeParse(masukanArsip({ judul: "a".repeat(201) })).success).toBe(false);
    expect(arsipFormSchema.safeParse(masukanArsip({ kategori: "a".repeat(100) })).success).toBe(
      true,
    );
    expect(arsipFormSchema.safeParse(masukanArsip({ kategori: "a".repeat(101) })).success).toBe(
      false,
    );
  });

  it("membatasi nama berkas 255 karakter", () => {
    expect(arsipFormSchema.safeParse(masukanArsip({ berkas: "a".repeat(255) })).success).toBe(true);
    expect(arsipFormSchema.safeParse(masukanArsip({ berkas: "a".repeat(256) })).success).toBe(
      false,
    );
  });

  it("mengizinkan kategori dan berkas kosong", () => {
    expect(arsipFormSchema.safeParse(masukanArsip({ kategori: null, berkas: null })).success).toBe(
      true,
    );
  });
});
