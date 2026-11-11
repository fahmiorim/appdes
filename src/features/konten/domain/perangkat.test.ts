import { describe, expect, it } from "vitest";

import {
  jabatanFormSchema,
  labelJenisKelamin,
  labelStatusPerangkat,
  perangkatFormSchema,
  slugJabatan,
} from "./perangkat";

const PERANGKAT_VALID = {
  nama: "Budi Santoso",
  jabatanId: "none",
  gelarDepan: "",
  gelarBelakang: "",
  nip: "",
  nik: "",
  jenisKelamin: "none",
  tempatLahir: "",
  tanggalLahir: "",
  penandaTangan: false,
  status: "aktif",
  urut: "1",
};

describe("jabatanFormSchema", () => {
  it("menerima jabatan valid dan mengubah urutan menjadi angka", () => {
    const hasil = jabatanFormSchema.safeParse({ nama: "Kaur Keuangan", urut: "4" });

    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.urut).toBe(4);
  });

  it("menolak nama kosong", () => {
    expect(jabatanFormSchema.safeParse({ nama: "  ", urut: "1" }).success).toBe(false);
  });
});

describe("perangkatFormSchema", () => {
  it("menerjemahkan pilihan kosong menjadi null", () => {
    const hasil = perangkatFormSchema.safeParse(PERANGKAT_VALID);

    expect(hasil.success).toBe(true);
    if (!hasil.success) return;

    expect(hasil.data.jabatanId).toBeNull();
    expect(hasil.data.jenisKelamin).toBeNull();
    expect(hasil.data.nik).toBeNull();
    expect(hasil.data.urut).toBe(1);
  });

  it("menolak NIK yang bukan 16 angka", () => {
    expect(perangkatFormSchema.safeParse({ ...PERANGKAT_VALID, nik: "123" }).success).toBe(false);
    expect(
      perangkatFormSchema.safeParse({ ...PERANGKAT_VALID, nik: "3201012001000001" }).success,
    ).toBe(true);
  });

  it("menolak status dan jenis kelamin yang tidak dikenal", () => {
    expect(perangkatFormSchema.safeParse({ ...PERANGKAT_VALID, status: "pensiun" }).success).toBe(
      false,
    );
    expect(
      perangkatFormSchema.safeParse({ ...PERANGKAT_VALID, jenisKelamin: "lainnya" }).success,
    ).toBe(false);
  });
});

describe("helper perangkat", () => {
  it("membentuk slug jabatan yang aman", () => {
    expect(slugJabatan("Kaur Tata Usaha & Umum")).toBe("kaur-tata-usaha-umum");
    expect(slugJabatan("!!!")).toBe("jabatan");
  });

  it("menyisakan ruang akhiran unik agar slug jabatan tetap muat kolom 100", () => {
    const dasar = slugJabatan("a".repeat(200));

    expect(dasar.length).toBeLessThanOrEqual(96);
    expect(`${dasar}-200`.length).toBeLessThanOrEqual(100);
  });

  it("memberi label jenis kelamin dan status", () => {
    expect(labelJenisKelamin("male")).toBe("Laki-laki");
    expect(labelJenisKelamin("female")).toBe("Perempuan");
    expect(labelJenisKelamin(null)).toBe("—");
    expect(labelStatusPerangkat("nonaktif")).toBe("Nonaktif");
    expect(labelStatusPerangkat("aktif")).toBe("Aktif");
  });
});
