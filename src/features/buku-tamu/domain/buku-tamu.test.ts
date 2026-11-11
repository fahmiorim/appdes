import { describe, expect, it } from "vitest";

import { bukuTamuFormSchema } from "./buku-tamu";

function masukanBukuTamu(ubah: Partial<Record<string, unknown>> = {}) {
  return {
    nama: "  Siti Rahma  ",
    instansi: "Dinas Pendidikan",
    keperluan: "Koordinasi program",
    tanggal: "2026-02-03",
    jamMasuk: "09:00",
    jamKeluar: "10:30",
    keterangan: "",
    ...ubah,
  };
}

describe("validasi buku tamu", () => {
  it("memangkas spasi pada nama dan instansi", () => {
    const hasil = bukuTamuFormSchema.parse(masukanBukuTamu({ instansi: "  Dinas Kesehatan " }));

    expect(hasil.nama).toBe("Siti Rahma");
    expect(hasil.instansi).toBe("Dinas Kesehatan");
  });

  it("mewajibkan nama dan tanggal", () => {
    expect(bukuTamuFormSchema.safeParse(masukanBukuTamu({ nama: "   " })).success).toBe(false);
    expect(bukuTamuFormSchema.safeParse(masukanBukuTamu({ tanggal: "" })).success).toBe(false);
  });

  it("membatasi nama dan instansi maksimal 200 karakter", () => {
    expect(bukuTamuFormSchema.safeParse(masukanBukuTamu({ nama: "a".repeat(200) })).success).toBe(
      true,
    );
    expect(bukuTamuFormSchema.safeParse(masukanBukuTamu({ nama: "a".repeat(201) })).success).toBe(
      false,
    );
    expect(
      bukuTamuFormSchema.safeParse(masukanBukuTamu({ instansi: "a".repeat(201) })).success,
    ).toBe(false);
  });

  it("mengizinkan instansi, keperluan, jam, dan keterangan kosong", () => {
    const hasil = bukuTamuFormSchema.parse(
      masukanBukuTamu({ instansi: null, keperluan: null, jamMasuk: null, jamKeluar: null }),
    );

    expect(hasil.instansi).toBeNull();
    expect(hasil.jamMasuk).toBeNull();
    expect(hasil.jamKeluar).toBeNull();
  });
});
