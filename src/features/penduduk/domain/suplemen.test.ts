import { describe, expect, it } from "vitest";

import {
  SASARAN_KELUARGA,
  SASARAN_LABELS,
  SASARAN_PENDUDUK,
  suplemenCreateSchema,
  suplemenTerdataSchema,
  suplemenUpdateSchema,
  type SuplemenCreateInput,
  type SuplemenTerdataInput,
} from "./suplemen";

describe("SASARAN constants", () => {
  it("mengatur konstanta sasaran penduduk dan keluarga", () => {
    expect(SASARAN_PENDUDUK).toBe(1);
    expect(SASARAN_KELUARGA).toBe(2);
  });

  it("memiliki label yang sesuai untuk setiap sasaran", () => {
    expect(SASARAN_LABELS[SASARAN_PENDUDUK]).toBe("Penduduk");
    expect(SASARAN_LABELS[SASARAN_KELUARGA]).toBe("Keluarga (KK)");
  });
});

describe("suplemenCreateSchema", () => {
  it("menerima input wajib nama dengan minimal 1 karakter", () => {
    const input: SuplemenCreateInput = {
      nama: "Bansos QRIS",
      sasaran: SASARAN_PENDUDUK,
      dataFormIsian: [],
    };
    const parsed = suplemenCreateSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("menerima keterangan opsional", () => {
    const parsed = suplemenCreateSchema.safeParse({
      nama: "Data Bansos",
      sasaran: SASARAN_KELUARGA,
      keterangan: "Tahun 2026",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.keterangan).toBe("Tahun 2026");
  });

  it("menerima keterangan null", () => {
    const parsed = suplemenCreateSchema.safeParse({
      nama: "Data Bansos",
      sasaran: SASARAN_PENDUDUK,
      keterangan: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("menolak nama kosong", () => {
    expect(suplemenCreateSchema.safeParse({ nama: "", sasaran: 1 }).success).toBe(false);
  });

  it("menolak nama lebih dari 200 karakter", () => {
    expect(suplemenCreateSchema.safeParse({ nama: "x".repeat(201), sasaran: 1 }).success).toBe(
      false,
    );
  });

  it("menggunakan default sasaran penduduk ketika tidak diberikan", () => {
    const parsed = suplemenCreateSchema.safeParse({ nama: "Suplemen Baru" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.sasaran).toBe(SASARAN_PENDUDUK);
  });
});

describe("suplemenUpdateSchema", () => {
  it("memerlukan id positif pada update", () => {
    expect(suplemenUpdateSchema.safeParse({ id: 0, nama: "Ubah" }).success).toBe(false);
    expect(suplemenUpdateSchema.safeParse({ id: -1, nama: "Ubah" }).success).toBe(false);
  });

  it("menerima update dengan id valid", () => {
    const parsed = suplemenUpdateSchema.safeParse({
      id: 5,
      nama: "Nama Baru",
      sasaran: SASARAN_KELUARGA,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.id).toBe(5);
  });
});

describe("suplemenTerdataSchema", () => {
  it("menerima input dengan pendudukId", () => {
    const input: SuplemenTerdataInput = {
      suplemenId: 1,
      pendudukId: 10,
    };
    const parsed = suplemenTerdataSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("menerima input dengan keluargaId", () => {
    const parsed = suplemenTerdataSchema.safeParse({
      suplemenId: 1,
      keluargaId: 5,
    });
    expect(parsed.success).toBe(true);
  });

  it("menolak input tanpa pendudukId maupun keluargaId", () => {
    const parsed = suplemenTerdataSchema.safeParse({
      suplemenId: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("menolak input dengan kedua sasaran sekaligus", () => {
    const parsed = suplemenTerdataSchema.safeParse({
      suplemenId: 1,
      pendudukId: 10,
      keluargaId: 5,
    });
    expect(parsed.success).toBe(false);
  });

  it("menerima isian dinamis opsional", () => {
    const parsed = suplemenTerdataSchema.safeParse({
      suplemenId: 1,
      pendudukId: 10,
      isian: { "Jenis Kelamin": "Laki-laki" },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("validasi suplemen - data_form_isian", () => {
  it("menerima isian dinamis kosong atau array", () => {
    const parsed1 = suplemenCreateSchema.parse({
      nama: "Program Lansia",
      sasaran: 1,
      dataFormIsian: [],
    });
    expect(parsed1.dataFormIsian).toEqual([]);

    const parsed2 = suplemenCreateSchema.parse({
      nama: "Program Lansia",
      sasaran: 1,
      dataFormIsian: [{ label: "Usia", tipe: "text", required: true }],
    });
    expect(parsed2.dataFormIsian?.length).toBe(1);
  });

  it("menolak dataFormIsian bukan array", () => {
    const hasil = suplemenCreateSchema.safeParse({
      nama: "Program",
      sasaran: 1,
      dataFormIsian: "invalid",
    });
    expect(hasil.success).toBe(false);
  });
});

describe("validasi suplemen - cetak dan isian", () => {
  it("menerima suplemen dengan dataFormIsian untuk pencetakan", () => {
    const parsed = suplemenCreateSchema.parse({
      nama: "BLT Desa",
      sasaran: 2,
      dataFormIsian: [
        { label: "Nomor KKS", tipe: "text", required: true },
        { label: "Penerima", tipe: "text", required: false },
      ],
    });
    expect(parsed.dataFormIsian?.length).toBe(2);
    expect(parsed.dataFormIsian?.[0]?.label).toBe("Nomor KKS");
  });
});
