import { describe, expect, it } from "vitest";

import {
  asalDanaLabel,
  bantuanFormSchema,
  buildProgramSlug,
  isSasaranTersedia,
  pesertaFormSchema,
  SASARAN_KELOMPOK,
  SASARAN_KELUARGA,
  SASARAN_PENDUDUK,
  SASARAN_RUMAH_TANGGA,
  SASARAN_TERSEDIA,
  sasaranLabel,
  statusMasaAktif,
} from "@/features/bantuan/domain/bantuan";
import { NO_SELECTION } from "@/lib/forms";

const minimalInput = {
  nama: "Bantuan Langsung Tunai",
  sasaran: "1",
  keterangan: "",
  tanggalMulai: "",
  tanggalAkhir: "",
  asalDana: "",
};

describe("bantuanFormSchema", () => {
  it("menerima input valid dan memangkas spasi", () => {
    const result = bantuanFormSchema.parse({
      nama: "  Program Keluarga Harapan ",
      sasaran: "2",
      keterangan: "  Bantuan tunai bersyarat ",
      tanggalMulai: "2026-01-01",
      tanggalAkhir: "2026-12-31",
      asalDana: "1",
    });

    expect(result.nama).toBe("Program Keluarga Harapan");
    expect(result.sasaran).toBe(2);
    expect(result.keterangan).toBe("Bantuan tunai bersyarat");
    expect(result.tanggalMulai).toBe("2026-01-01");
    expect(result.tanggalAkhir).toBe("2026-12-31");
    expect(result.asalDana).toBe(1);
  });

  it("menormalkan pilihan kosong menjadi null", () => {
    const result = bantuanFormSchema.parse({ ...minimalInput, sasaran: NO_SELECTION });

    expect(result.sasaran).toBeNull();
    expect(result.asalDana).toBeNull();
    expect(result.tanggalMulai).toBeNull();
    expect(result.tanggalAkhir).toBeNull();
    expect(result.keterangan).toBe("");
  });

  it("menolak nama kosong", () => {
    expect(bantuanFormSchema.safeParse({ ...minimalInput, nama: "   " }).success).toBe(false);
  });

  it("menolak sasaran di luar 1–4", () => {
    expect(bantuanFormSchema.safeParse({ ...minimalInput, sasaran: "5" }).success).toBe(false);
    expect(bantuanFormSchema.safeParse({ ...minimalInput, sasaran: "0" }).success).toBe(false);
  });

  it("menolak asal dana di luar 1–5", () => {
    expect(bantuanFormSchema.safeParse({ ...minimalInput, asalDana: "6" }).success).toBe(false);
  });

  it("menolak tanggal yang tidak valid", () => {
    expect(
      bantuanFormSchema.safeParse({ ...minimalInput, tanggalMulai: "31-12-2026" }).success,
    ).toBe(false);
  });

  it("menolak keterangan yang terlalu panjang", () => {
    const tooLong = "a".repeat(501);
    expect(bantuanFormSchema.safeParse({ ...minimalInput, keterangan: tooLong }).success).toBe(
      false,
    );
  });
});

describe("pesertaFormSchema", () => {
  it("menerima sasaran terpilih dan memangkas isian kartu", () => {
    const result = pesertaFormSchema.parse({
      programId: "7",
      sasaranId: "12",
      nomorKartu: "  KKS-001 ",
      kartuNik: "3201012001990001",
      kartuNama: "  Budi Santoso ",
      kartuTempatLahir: "Bandung",
      kartuTanggalLahir: "1990-05-01",
      kartuAlamat: "Jl. Melati No. 3",
    });

    expect(result.programId).toBe(7);
    expect(result.sasaranId).toBe(12);
    expect(result.nomorKartu).toBe("KKS-001");
    expect(result.kartuNik).toBe("3201012001990001");
    expect(result.kartuNama).toBe("Budi Santoso");
  });

  it("menormalkan isian kartu kosong menjadi null", () => {
    const result = pesertaFormSchema.parse({
      programId: "7",
      sasaranId: NO_SELECTION,
      nomorKartu: "",
      kartuNik: "",
      kartuNama: "",
      kartuTempatLahir: "",
      kartuTanggalLahir: "",
      kartuAlamat: "",
    });

    expect(result.sasaranId).toBeNull();
    expect(result.kartuNik).toBeNull();
    expect(result.kartuTanggalLahir).toBeNull();
    expect(result.nomorKartu).toBe("");
  });

  it("menolak NIK yang bukan 16 angka", () => {
    expect(
      pesertaFormSchema.safeParse({
        programId: "7",
        sasaranId: "1",
        kartuNik: "123",
      }).success,
    ).toBe(false);
  });
});

describe("buildProgramSlug", () => {
  it("membentuk slug dari nama", () => {
    expect(buildProgramSlug("Bantuan Langsung Tunai")).toBe("bantuan-langsung-tunai");
    expect(buildProgramSlug("  PKH 2026  ")).toBe("pkh-2026");
  });

  it("menggabungkan tanda baca berulang menjadi satu tanda hubung", () => {
    expect(buildProgramSlug("Bantuan -- Sosial // Desa")).toBe("bantuan-sosial-desa");
  });

  it("memakai awalan program bila nama tidak menghasilkan slug", () => {
    expect(buildProgramSlug("!!!")).toBe("program");
    expect(buildProgramSlug("")).toBe("program");
  });
});

describe("statusMasaAktif", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("menandai program yang belum dimulai", () => {
    expect(statusMasaAktif("2026-07-01", "2026-12-31", now)).toBe("belum");
  });

  it("menandai program yang sudah selesai", () => {
    expect(statusMasaAktif("2026-01-01", "2026-05-31", now)).toBe("selesai");
  });

  it("menandai program yang sedang berjalan", () => {
    expect(statusMasaAktif("2026-01-01", "2026-12-31", now)).toBe("aktif");
  });

  it("menganggap batas tanggal bersifat inklusif", () => {
    expect(statusMasaAktif("2026-06-15", "2026-06-15", now)).toBe("aktif");
  });

  it("menganggap program tanpa rentang tanggal selalu aktif", () => {
    expect(statusMasaAktif(null, null, now)).toBe("aktif");
  });

  it("hanya memeriksa batas yang diisi", () => {
    expect(statusMasaAktif(null, "2026-05-31", now)).toBe("selesai");
    expect(statusMasaAktif("2026-07-01", null, now)).toBe("belum");
  });
});

describe("pembantu label", () => {
  it("melabeli sasaran yang dikenal", () => {
    expect(sasaranLabel(SASARAN_PENDUDUK)).toBe("Penduduk");
    expect(sasaranLabel(SASARAN_KELUARGA)).toBe("Keluarga (KK)");
    expect(sasaranLabel(SASARAN_RUMAH_TANGGA)).toBe("Rumah Tangga (RTM)");
    expect(sasaranLabel(SASARAN_KELOMPOK)).toBe("Kelompok");
  });

  it("memakai tanda hubung untuk label yang tak dikenal", () => {
    expect(sasaranLabel(null)).toBe("-");
    expect(sasaranLabel(99)).toBe("-");
    expect(asalDanaLabel(null)).toBe("-");
    expect(asalDanaLabel(99)).toBe("-");
  });

  it("melabeli asal dana yang dikenal", () => {
    expect(asalDanaLabel(1)).toBe("Pusat");
    expect(asalDanaLabel(4)).toBe("Desa");
  });
});

describe("isSasaranTersedia", () => {
  it("menyatakan sasaran yang sudah dapat diisi peserta", () => {
    expect(isSasaranTersedia(SASARAN_PENDUDUK)).toBe(true);
    expect(isSasaranTersedia(SASARAN_KELUARGA)).toBe(true);
    expect(isSasaranTersedia(SASARAN_RUMAH_TANGGA)).toBe(true);
  });

  it("menyatakan sasaran kelompok kini tersedia", () => {
    expect(isSasaranTersedia(SASARAN_KELOMPOK)).toBe(true);
  });

  it("menolak sasaran di luar katalog", () => {
    expect(isSasaranTersedia(5)).toBe(false);
    expect(isSasaranTersedia(0)).toBe(false);
  });

  it("menyediakan keempat jenis sasaran", () => {
    expect(SASARAN_TERSEDIA).toEqual([
      SASARAN_PENDUDUK,
      SASARAN_KELUARGA,
      SASARAN_RUMAH_TANGGA,
      SASARAN_KELOMPOK,
    ]);
  });
});

describe("validasi peserta bantuan", () => {
  it("menerima peserta dengan nomor kartu opsional", () => {
    const parsed = pesertaFormSchema.parse({
      programId: "1",
      sasaranId: "1",
      nomorKartu: "",
      kartuNik: "",
      kartuNama: "",
      kartuTempatLahir: "",
      kartuTanggalLahir: null,
      kartuAlamat: "",
    });
    expect(parsed.programId).toBe(1);
    expect(parsed.nomorKartu).toBe("");
  });

  it("menerima nomor kartu maksimal 60 karakter", () => {
    const parsed = pesertaFormSchema.parse({
      programId: "1",
      sasaranId: "1",
      nomorKartu: "KARTU-12345678901234567890123456789012345678901234567890",
      kartuNik: "",
      kartuNama: "",
      kartuTempatLahir: "",
      kartuTanggalLahir: null,
      kartuAlamat: "",
    });
    expect(parsed.nomorKartu).toBeTruthy();
  });

  it("menolak nomor kartu lebih dari 60 karakter", () => {
    expect(
      pesertaFormSchema.safeParse({
        programId: "1",
        sasaranId: "1",
        nomorKartu: "x".repeat(61),
        kartuNik: "",
        kartuNama: "",
        kartuTempatLahir: "",
        kartuTanggalLahir: null,
        kartuAlamat: "",
      }).success,
    ).toBe(false);
  });
});
