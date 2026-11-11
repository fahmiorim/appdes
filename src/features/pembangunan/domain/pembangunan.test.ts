import { describe, expect, it } from "vitest";

import {
  buildPembangunanSlug,
  formatAnggaran,
  pembangunanFormSchema,
  statusPembangunanLabel,
  sumberDanaLabel,
} from "./pembangunan";

describe("buildPembangunanSlug", () => {
  it("membentuk slug huruf kecil dari judul", () => {
    expect(buildPembangunanSlug("Pembangunan Jalan Desa")).toBe("pembangunan-jalan-desa");
  });

  it("membuang tanda baca di tepi dan menggabungkan spasi", () => {
    expect(buildPembangunanSlug("  Drainase RT 01 — 2026! ")).toBe("drainase-rt-01-2026");
  });

  it("memberi slug cadangan bila judul tanpa huruf/angka", () => {
    expect(buildPembangunanSlug("!!!")).toBe("proyek");
  });
});

describe("label status & sumber dana", () => {
  it("mengembalikan label status yang dikenal", () => {
    expect(statusPembangunanLabel("berjalan")).toBe("Berjalan");
    expect(statusPembangunanLabel("selesai")).toBe("Selesai");
  });

  it("mengembalikan '-' untuk status tidak dikenal", () => {
    expect(statusPembangunanLabel(null)).toBe("-");
    expect(statusPembangunanLabel("entah")).toBe("-");
  });

  it("mengembalikan '-' untuk sumber dana kosong", () => {
    expect(sumberDanaLabel(null)).toBe("-");
    expect(sumberDanaLabel("   ")).toBe("-");
    expect(sumberDanaLabel("Dana Desa")).toBe("Dana Desa");
  });
});

describe("pembangunanFormSchema", () => {
  const valid = {
    judul: "Pembangunan Jalan",
    deskripsi: "",
    lokasi: "RT 01",
    tahunAnggaran: "2026",
    sumberDana: "Dana Desa",
    anggaran: "150000000",
    volume: "250",
    satuan: "meter",
    pelaksana: "Swakelola",
    mulai: "2026-01-05",
    selesai: "",
    status: "berjalan",
    progres: "40",
    hasil: "",
  };

  it("menerima isian lengkap dan mengubah angka menjadi number", () => {
    const parsed = pembangunanFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.tahunAnggaran).toBe(2026);
    expect(parsed.data.anggaran).toBe(150_000_000);
    expect(parsed.data.progres).toBe(40);
    expect(parsed.data.selesai).toBeNull();
  });

  it("menolak judul kosong", () => {
    const parsed = pembangunanFormSchema.safeParse({ ...valid, judul: "   " });
    expect(parsed.success).toBe(false);
  });

  it("menolak progres di luar 0–100", () => {
    const parsed = pembangunanFormSchema.safeParse({ ...valid, progres: "120" });
    expect(parsed.success).toBe(false);
  });

  it("menolak status yang tidak dikenal", () => {
    const parsed = pembangunanFormSchema.safeParse({ ...valid, status: "entah" });
    expect(parsed.success).toBe(false);
  });

  it("mengosongkan tahun anggaran di luar rentang", () => {
    const parsed = pembangunanFormSchema.safeParse({ ...valid, tahunAnggaran: "1999" });
    expect(parsed.success).toBe(false);
  });
});

describe("formatAnggaran", () => {
  it("memformat nilai desimal menjadi rupiah tanpa sen", () => {
    expect(formatAnggaran("150000000.00")).toContain("150.000.000");
  });

  it("mengembalikan '-' untuk nilai kosong", () => {
    expect(formatAnggaran(null)).toBe("-");
    expect(formatAnggaran("")).toBe("-");
  });
});
