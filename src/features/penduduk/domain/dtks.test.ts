import { describe, expect, it } from "vitest";

import {
  DTKS_STATUS,
  DTKS_STATUS_LABELS,
  DTKS_VERSI,
  DTKS_VERSI_LABELS,
  dtksCreateSchema,
  dtksUpdateSchema,
} from "./dtks";

describe("konfigurasi DTKS", () => {
  it("memuat semua versi dan status dengan label", () => {
    for (const versi of DTKS_VERSI) {
      expect(DTKS_VERSI_LABELS[versi]).toBeTruthy();
    }
    for (const status of DTKS_STATUS) {
      expect(DTKS_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("menolak versi kuisioner yang tidak dikenal", () => {
    const hasil = dtksCreateSchema.safeParse({ rtmId: "1", versiKuisioner: "lama" });
    expect(hasil.success).toBe(false);
  });

  it("menerima create dengan versi default", () => {
    const parsed = dtksCreateSchema.parse({ rtmId: "5" });
    expect(parsed.versiKuisioner).toBe("regsos_ek2022_k");
  });

  it("menolak status DTKS yang tidak valid pada update", () => {
    const hasil = dtksUpdateSchema.safeParse({ status: "selesai" });
    expect(hasil.success).toBe(false);
  });

  it("menerima update yang valid", () => {
    const parsed = dtksUpdateSchema.parse({ status: "terverifikasi" });
    expect(parsed.status).toBe("terverifikasi");
  });
});

describe("validasi create DTKS", () => {
  it("menolak rtmId nol atau negatif", () => {
    expect(dtksCreateSchema.safeParse({ rtmId: 0 }).success).toBe(false);
    expect(dtksCreateSchema.safeParse({ rtmId: -5 }).success).toBe(false);
  });

  it("menerima rtmId positif dengan keluargaId opsional", () => {
    const denganKk = dtksCreateSchema.parse({ rtmId: 3, keluargaId: 7 });
    expect(denganKk.rtmId).toBe(3);
    expect(denganKk.keluargaId).toBe(7);

    const tanpaKk = dtksCreateSchema.parse({ rtmId: 3 });
    expect(tanpaKk.keluargaId).toBeUndefined();
  });
});

describe("validasi update DTKS", () => {
  it("menerima update kosong (hanya status wajib)", () => {
    const parsed = dtksUpdateSchema.parse({ status: "draf" });
    expect(parsed.tanggalPencacahan).toBeUndefined();
    expect(parsed.keterangan).toBeUndefined();
  });

  it("menolak string melebihi batas maxLength pada nama petugas", () => {
    expect(
      dtksUpdateSchema.safeParse({ status: "draf", namaPetugasPencacahan: "x".repeat(101) })
        .success,
    ).toBe(false);
  });

  it("menolak string melebihi batas maxLength pada keterangan", () => {
    expect(
      dtksUpdateSchema.safeParse({ status: "draf", keterangan: "x".repeat(2001) }).success,
    ).toBe(false);
  });

  it("menerima string tepat di batas maxLength", () => {
    const parsed = dtksUpdateSchema.parse({
      status: "draf",
      namaPetugasPencacahan: "x".repeat(100),
      keterangan: "x".repeat(2000),
    });
    expect(parsed.namaPetugasPencacahan?.length).toBe(100);
    expect(parsed.keterangan?.length).toBe(2000);
  });

  it("menormalisasi whitespace pada field teks", () => {
    const parsed = dtksUpdateSchema.parse({ status: "draf", namaResponden: "   Ani   " });
    expect(parsed.namaResponden).toBe("Ani");
  });

  it("menerima tanggal null atau string ISO", () => {
    expect(
      dtksUpdateSchema.safeParse({ status: "draf", tanggalPencacahan: "2026-01-15" }).success,
    ).toBe(true);
    expect(dtksUpdateSchema.safeParse({ status: "draf", tanggalPencacahan: null }).success).toBe(
      true,
    );
  });
});

describe("validasi batasan DTKS", () => {
  it("menerima update dengan semua field opsional valid", () => {
    const parsed = dtksUpdateSchema.parse({
      status: "terverifikasi",
      tanggalPencacahan: "2024-01-15",
      tanggalPemeriksaan: "2024-01-16",
      namaPetugasPencacahan: "Budi Santoso",
      namaResponden: "Siti Aminah",
      keterangan: "Sudah diverifikasi lapangan",
    });
    expect(parsed.status).toBe("terverifikasi");
    expect(parsed.namaPetugasPencacahan).toBe("Budi Santoso");
  });

  it("menolak tanggal tidak valid format jika bukan string", () => {
    const hasil = dtksUpdateSchema.safeParse({ status: "draf", tanggalPencacahan: 123 });
    expect(hasil.success).toBe(false);
  });
});

describe("konstanta DTKS", () => {
  it("memiliki konstanta status dan versi yang lengkap", () => {
    expect(DTKS_STATUS).toEqual(["draf", "terverifikasi"]);
    expect(DTKS_VERSI).toEqual(["regsos_ek2022_k"]);
  });
});

describe("validasi alur DTKS", () => {
  it("menerima create dengan keluargaId opsional", () => {
    const parsed = dtksCreateSchema.parse({ rtmId: 123, keluargaId: null });
    expect(parsed.rtmId).toBe(123);
    expect(parsed.keluargaId).toBeNull();
  });

  it("menerima update status draf ke terverifikasi", () => {
    const parsed = dtksUpdateSchema.parse({
      status: "terverifikasi",
      tanggalPemeriksaan: "2024-02-01",
      namaPetugasPencacahan: "Petugas A",
    });
    expect(parsed.status).toBe("terverifikasi");
    expect(parsed.tanggalPemeriksaan).toBe("2024-02-01");
  });

  it("menolak update tanpa status", () => {
    expect(dtksUpdateSchema.safeParse({ keterangan: "test" }).success).toBe(false);
  });
});

describe("validasi DTKS detail", () => {
  it("menerima update dengan petugas dan responden", () => {
    const parsed = dtksUpdateSchema.parse({
      status: "draf",
      namaPetugasPencacahan: "Petugas 1",
      namaResponden: "Responden 1",
      tanggalPencacahan: "2024-03-01",
    });
    expect(parsed.namaPetugasPencacahan).toBe("Petugas 1");
    expect(parsed.namaResponden).toBe("Responden 1");
  });
});
