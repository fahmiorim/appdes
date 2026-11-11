import { describe, expect, it } from "vitest";

import {
  DOKUMEN_API_MAX_PAGE_SIZE,
  DOKUMEN_JENIS,
  DOKUMEN_JENIS_LABELS,
  dokumenJenisLabel,
  parsePaginasiDokumen,
  susunArsipDokumen,
  susunPaginasiDokumen,
} from "./dokumen";

describe("dokumenJenisLabel", () => {
  it("memberi label untuk jenis baku", () => {
    for (const jenis of DOKUMEN_JENIS) {
      expect(dokumenJenisLabel(jenis)).toBe(DOKUMEN_JENIS_LABELS[jenis]);
    }
  });

  it("mempertahankan jenis lama yang tidak dikenal", () => {
    expect(dokumenJenisLabel("surat_edaran")).toBe("surat_edaran");
  });

  it("memakai label 'Tanpa jenis' untuk nilai kosong", () => {
    expect(dokumenJenisLabel(null)).toBe("Tanpa jenis");
    expect(dokumenJenisLabel("")).toBe("Tanpa jenis");
  });
});

describe("susunArsipDokumen", () => {
  it("mengelompokkan per tahun (terbaru dulu) lalu per jenis", () => {
    const arsip = susunArsipDokumen([
      { tahun: 2025, jenis: "peraturan_desa" },
      { tahun: 2026, jenis: "peraturan_kepala_desa" },
      { tahun: 2026, jenis: "peraturan_desa" },
      { tahun: 2026, jenis: "peraturan_desa" },
    ]);

    expect(arsip.map((item) => item.tahun)).toEqual([2026, 2025]);
    expect(arsip[0]?.jumlah).toBe(3);
    expect(arsip[0]?.jenis).toEqual([
      { jenis: "peraturan_desa", label: "Peraturan Desa", jumlah: 2 },
      { jenis: "peraturan_kepala_desa", label: "Peraturan Kepala Desa", jumlah: 1 },
    ]);
  });

  it("meletakkan dokumen tanpa tahun di akhir", () => {
    const arsip = susunArsipDokumen([
      { tahun: null, jenis: null },
      { tahun: 2024, jenis: "peraturan_desa" },
    ]);
    expect(arsip.map((item) => item.tahun)).toEqual([2024, null]);
    expect(arsip[1]?.jenis[0]).toEqual({ jenis: null, label: "Tanpa jenis", jumlah: 1 });
  });

  it("mengembalikan daftar kosong saat tidak ada dokumen", () => {
    expect(susunArsipDokumen([])).toEqual([]);
  });
});

describe("susunPaginasiDokumen", () => {
  it("membatasi ukuran halaman dan halaman yang diminta ke hasil terakhir", () => {
    expect(susunPaginasiDokumen(205, 9, DOKUMEN_API_MAX_PAGE_SIZE + 1)).toEqual({
      page: 3,
      pageSize: DOKUMEN_API_MAX_PAGE_SIZE,
      offset: 200,
      totalPages: 3,
    });
  });

  it("memakai nilai aman untuk masukan halaman tidak valid dan hasil kosong", () => {
    expect(susunPaginasiDokumen(0, Number.NaN, 0)).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
      totalPages: 0,
    });
  });
});

describe("parsePaginasiDokumen", () => {
  it("memakai bawaan dan menolak parameter di luar batas", () => {
    expect(parsePaginasiDokumen(null, null)).toEqual({ page: 1, pageSize: 20 });
    expect(parsePaginasiDokumen("2", "100")).toEqual({ page: 2, pageSize: 100 });
    expect(parsePaginasiDokumen("0", "20")).toBeNull();
    expect(parsePaginasiDokumen("1", "101")).toBeNull();
  });
});
