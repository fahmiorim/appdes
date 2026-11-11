import { describe, expect, it } from "vitest";

import { dokumenPublikFormSchema } from "./dokumen";
import { cekParentMenu } from "./menu";
import { sliderFormSchema } from "./slider";
import { pengaturanWidgetValid, widgetFormSchema } from "./widget";

const MENU_ROWS = [
  { id: 1, parentId: null },
  { id: 2, parentId: 1 },
  { id: 3, parentId: null },
];

describe("cekParentMenu", () => {
  it("menerima menu tanpa induk dan induk tingkat pertama", () => {
    expect(cekParentMenu(MENU_ROWS, null)).toBeNull();
    expect(cekParentMenu(MENU_ROWS, 3, 2)).toBeNull();
  });

  it("menolak induk yang tidak ada, diri sendiri, dan induk bertingkat", () => {
    expect(cekParentMenu(MENU_ROWS, 99)).toContain("tidak ditemukan");
    expect(cekParentMenu(MENU_ROWS, 1, 1)).toContain("dirinya sendiri");
    expect(cekParentMenu(MENU_ROWS, 2, 3)).toContain("tingkat pertama");
  });
});

describe("widgetFormSchema", () => {
  const valid = {
    judul: "Pengumuman",
    isi: "Isi pengumuman",
    jenis: "3",
    pengaturan: '{"batas":5}',
    urut: "2",
    aktif: true,
  };

  it("menerima widget valid dan mengubah angka form", () => {
    const hasil = widgetFormSchema.safeParse(valid);

    expect(hasil.success).toBe(true);
    if (!hasil.success) return;
    expect(hasil.data.jenis).toBe(3);
    expect(hasil.data.urut).toBe(2);
  });

  it("menolak jenis di luar 1-6 dan pengaturan JSON rusak", () => {
    expect(widgetFormSchema.safeParse({ ...valid, jenis: "9" }).success).toBe(false);
    expect(widgetFormSchema.safeParse({ ...valid, pengaturan: "{rusak" }).success).toBe(false);
  });

  it("menganggap pengaturan kosong valid", () => {
    expect(pengaturanWidgetValid("")).toBe(true);
    expect(pengaturanWidgetValid(null)).toBe(true);
    expect(pengaturanWidgetValid("{rusak")).toBe(false);
  });
});

describe("sliderFormSchema", () => {
  it("menerima slider valid", () => {
    const hasil = sliderFormSchema.safeParse({
      gambar: "/media/desa/slider/beranda.jpg",
      judul: "Selamat datang",
      keterangan: "Situs resmi desa",
      tautan: "/desa/profil",
      urut: "0",
      aktif: true,
    });

    expect(hasil.success).toBe(true);
  });

  it("menolak gambar kosong", () => {
    const hasil = sliderFormSchema.safeParse({
      gambar: " ",
      judul: "",
      keterangan: "",
      tautan: "",
      urut: 0,
      aktif: true,
    });

    expect(hasil.success).toBe(false);
  });
});

describe("dokumenPublikFormSchema", () => {
  const valid = {
    nama: "APBDes 2026",
    slug: "",
    kategori: "produk_hukum",
    jenis: "Peraturan Desa",
    nomor: "01/2026",
    keterangan: "Dokumen resmi",
    berkas: "/media/desa/dokumen/apbdes.pdf",
    tautan: "",
    tahun: "2026",
    aktif: true,
  };

  it("menerima dokumen valid dan mengosongkan slug otomatis", () => {
    const hasil = dokumenPublikFormSchema.safeParse(valid);

    expect(hasil.success).toBe(true);
    if (!hasil.success) return;
    expect(hasil.data.slug).toBe("");
    expect(hasil.data.tahun).toBe(2026);
  });

  it("mewajibkan berkas atau tautan", () => {
    const hasil = dokumenPublikFormSchema.safeParse({ ...valid, berkas: "", tautan: "" });
    expect(hasil.success).toBe(false);
  });

  it("menolak tautan yang bukan http(s) atau path absolut", () => {
    const hasil = dokumenPublikFormSchema.safeParse({ ...valid, tautan: "dokumen.pdf" });
    expect(hasil.success).toBe(false);
  });
});
