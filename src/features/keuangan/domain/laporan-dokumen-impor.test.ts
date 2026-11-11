import { describe, expect, it } from "vitest";

import { LAPORAN_TIPE, PDF_MIME } from "./laporan-dokumen";
import {
  judulDariNamaBerkas,
  MAKS_DOKUMEN_IMPOR,
  validasiImporDokumen,
  type ImporDokumenItem,
} from "./laporan-dokumen-impor";

function item(partial: Partial<ImporDokumenItem> = {}): ImporDokumenItem {
  return {
    nama: "laporan.pdf",
    ukuran: 1024,
    mime: PDF_MIME,
    judul: "Laporan APBDes Semester I",
    jenis: LAPORAN_TIPE.apbdes,
    tahun: 2026,
    semester: 1,
    ...partial,
  };
}

describe("judulDariNamaBerkas", () => {
  it("membuang ekstensi dan merapikan pemisah", () => {
    expect(judulDariNamaBerkas("Laporan_APBDes-2026.pdf")).toBe("Laporan APBDes 2026");
  });

  it("memberi judul bawaan bila nama terlalu pendek", () => {
    expect(judulDariNamaBerkas("a.pdf")).toBe("Dokumen Laporan");
  });
});

describe("validasiImporDokumen", () => {
  it("menolak daftar kosong", () => {
    const hasil = validasiImporDokumen([]);
    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toMatch(/minimal satu/i);
  });

  it("menolak melebihi batas jumlah dokumen", () => {
    const banyak = Array.from({ length: MAKS_DOKUMEN_IMPOR + 1 }, (_, i) =>
      item({ semester: (i % 2) + 1, tahun: 2000 + i }),
    );
    const hasil = validasiImporDokumen(banyak);
    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toMatch(/maksimal/i);
  });

  it("menerima berkas valid dan menormalkan metadata", () => {
    const hasil = validasiImporDokumen([item({ judul: "  Laporan Resmi  " })]);
    expect(hasil.ok).toBe(true);
    expect(hasil.pesan).toBeNull();
    expect(hasil.items[0]).toMatchObject({
      ok: true,
      judul: "Laporan Resmi",
      jenis: LAPORAN_TIPE.apbdes,
      tahun: 2026,
      semester: 1,
    });
  });

  it("menandai berkas non-PDF", () => {
    const hasil = validasiImporDokumen([item({ mime: "image/png", nama: "scan.png" })]);
    expect(hasil.ok).toBe(false);
    expect(hasil.items[0]?.ok).toBe(false);
    expect(hasil.items[0]?.pesan).toMatch(/PDF/i);
  });

  it("menandai berkas melebihi 8 MB", () => {
    const hasil = validasiImporDokumen([item({ ukuran: 9 * 1024 * 1024 })]);
    expect(hasil.items[0]?.ok).toBe(false);
    expect(hasil.items[0]?.pesan).toMatch(/8 MB/);
  });

  it("menolak judul terlalu pendek", () => {
    const hasil = validasiImporDokumen([item({ judul: "ab" })]);
    expect(hasil.items[0]?.ok).toBe(false);
    expect(hasil.items[0]?.pesan).toMatch(/judul/i);
  });

  it("menolak semester di luar 1 atau 2", () => {
    const hasil = validasiImporDokumen([item({ semester: 3 })]);
    expect(hasil.items[0]?.ok).toBe(false);
    expect(hasil.items[0]?.pesan).toMatch(/semester/i);
  });

  it("menolak tahun di luar rentang wajar", () => {
    const hasil = validasiImporDokumen([item({ tahun: 1800 })]);
    expect(hasil.items[0]?.ok).toBe(false);
  });

  it("menandai kombinasi jenis+tahun+semester ganda dalam satu impor", () => {
    const hasil = validasiImporDokumen([item({ nama: "a.pdf" }), item({ nama: "b.pdf" })]);
    expect(hasil.ok).toBe(false);
    expect(hasil.items[0]?.ok).toBe(true);
    expect(hasil.items[1]?.ok).toBe(false);
    expect(hasil.items[1]?.pesan).toMatch(/ganda/i);
  });

  it("menerima banyak dokumen dengan periode berbeda", () => {
    const hasil = validasiImporDokumen([
      item({ nama: "s1.pdf", semester: 1 }),
      item({ nama: "s2.pdf", semester: 2 }),
      item({ nama: "pend.pdf", jenis: LAPORAN_TIPE.penduduk, semester: 1 }),
    ]);
    expect(hasil.ok).toBe(true);
    expect(hasil.items).toHaveLength(3);
  });

  it("melaporkan jumlah gagal pada pesan ringkasan", () => {
    const hasil = validasiImporDokumen([
      item({ nama: "ok.pdf" }),
      item({ nama: "bad.png", mime: "image/png" }),
    ]);
    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toMatch(/1 dari 2/);
  });
});
