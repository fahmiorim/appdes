import { describe, expect, it } from "vitest";

import { cdesaMutasiSchema, cdesaSchema, persilFormSchema } from "./gis";

describe("validasi persil", () => {
  it("menerima isian valid dan menormalkan teks", () => {
    const parsed = persilFormSchema.parse({
      nomor: "  P-001  ",
      nomorCdesa: "  C-01 ",
      luas: "1250.5",
      status: " milik ",
      keterangan: "  Sawah  ",
    });

    expect(parsed).toMatchObject({
      nomor: "P-001",
      nomorCdesa: "C-01",
      luas: 1250.5,
      status: "milik",
      keterangan: "Sawah",
    });
  });

  it("menolak nomor kosong dan luas negatif", () => {
    expect(persilFormSchema.safeParse({ nomor: "  ", luas: 10 }).success).toBe(false);
    expect(persilFormSchema.safeParse({ nomor: "P-1", luas: -1 }).success).toBe(false);
  });

  it("memakai luas 0 bila tidak diisi", () => {
    expect(persilFormSchema.parse({ nomor: "P-1" }).luas).toBe(0);
  });
});

describe("validasi Cdesa", () => {
  it("menerima nomor dan tanggal opsional", () => {
    const parsed = cdesaSchema.parse({
      nomor: "C-01",
      nomorPersil: "P-1",
      tanggal: "2026-02-01",
      namaPemegang: "Budi",
      luas: "800",
    });

    expect(parsed.nomor).toBe("C-01");
    expect(parsed.tanggal).toBe("2026-02-01");
    expect(parsed.luas).toBe(800);
    expect(parsed.sortOrder).toBe(0);
  });

  it("menolak nomor kosong", () => {
    expect(cdesaSchema.safeParse({ nomor: " ", luas: 1 }).success).toBe(false);
  });
});

describe("validasi mutasi Cdesa", () => {
  it("mengubah cdesaId teks menjadi angka", () => {
    const parsed = cdesaMutasiSchema.parse({
      cdesaId: "4",
      nomor: "M-01",
      tanggal: "2026-03-01",
      tipe: "jual",
    });

    expect(parsed.cdesaId).toBe(4);
    expect(parsed.nomor).toBe("M-01");
  });

  it("mewajibkan cdesa, nomor, tanggal, dan jenis", () => {
    expect(cdesaMutasiSchema.safeParse({ cdesaId: 1, nomor: "M", tipe: "jual" }).success).toBe(
      false,
    );
    expect(
      cdesaMutasiSchema.safeParse({ cdesaId: 1, nomor: "M", tanggal: "2026-01-01" }).success,
    ).toBe(false);
    expect(
      cdesaMutasiSchema.safeParse({ cdesaId: 0, nomor: "M", tanggal: "2026-01-01", tipe: "jual" })
        .success,
    ).toBe(false);
  });
});
