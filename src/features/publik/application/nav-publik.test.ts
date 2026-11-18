import { describe, expect, it } from "vitest";

import type { MenuPublikRingkas } from "@/features/publik/infrastructure/content-repository";

import { bangunNavPublik, NAV_PUBLIK_BAWAAN } from "./nav-publik";

function menu(overrides: Partial<MenuPublikRingkas> = {}): MenuPublikRingkas {
  return {
    id: 1,
    nama: "Beranda",
    link: "/",
    linkTipe: "internal",
    parentId: null,
    urut: 1,
    aktif: true,
    ...overrides,
  };
}

describe("bangunNavPublik", () => {
  it("memakai urutan urut lalu id dan hanya baris aktif", () => {
    const hasil = bangunNavPublik([
      menu({ id: 3, nama: "Berita", link: "/berita", urut: 2 }),
      menu({ id: 2, nama: "Profil", link: "/profil", urut: 1 }),
      menu({ id: 1, nama: "Tersembunyi", link: "/rahasia", urut: 0, aktif: false }),
    ]);

    expect(hasil).toEqual([
      { href: "/profil", label: "Profil" },
      { href: "/berita", label: "Berita" },
    ]);
  });

  it("menampilkan anak tepat setelah induknya", () => {
    const hasil = bangunNavPublik([
      menu({ id: 1, nama: "Profil", link: "/profil", urut: 1 }),
      menu({ id: 2, nama: "Kontak", link: "/kontak", urut: 3 }),
      menu({ id: 3, nama: "Sejarah", link: "/sejarah", parentId: 1, urut: 2 }),
    ]);

    expect(hasil.map((item) => item.href)).toEqual(["/profil", "/sejarah", "/kontak"]);
  });

  it("memperlakukan anak tanpa induk aktif sebagai tautan tingkat atas", () => {
    const hasil = bangunNavPublik([
      menu({ id: 1, nama: "Profil", link: "/profil", urut: 1, aktif: false }),
      menu({ id: 2, nama: "Sejarah", link: "/sejarah", parentId: 1, urut: 2 }),
    ]);

    expect(hasil).toEqual([{ href: "/sejarah", label: "Sejarah" }]);
  });

  it("membuang tautan internal yang tidak valid dan tautan ganda", () => {
    const hasil = bangunNavPublik([
      menu({ id: 1, nama: "Skrip", link: "javascript:alert(1)" }),
      menu({ id: 2, nama: "Host lain", link: "//contoh.id/phish", urut: 2 }),
      menu({ id: 3, nama: "Beranda", link: "/", urut: 3 }),
      menu({ id: 4, nama: "Beranda lagi", link: "/", urut: 4 }),
    ]);

    expect(hasil).toEqual([{ href: "/", label: "Beranda" }]);
  });

  it("menandai tautan eksternal http(s) dan menolak skema lain", () => {
    const hasil = bangunNavPublik([
      menu({ id: 1, nama: "Kanal", link: "https://contoh.id/kanal", linkTipe: "eksternal" }),
      menu({
        id: 2,
        nama: "Data",
        link: "data:text/html,<script>alert(1)</script>",
        linkTipe: "eksternal",
        urut: 2,
      }),
    ]);

    expect(hasil).toEqual([{ href: "https://contoh.id/kanal", label: "Kanal", eksternal: true }]);
  });

  it("memakai navigasi bawaan bila tenant belum punya menu yang dapat dirender", () => {
    expect(bangunNavPublik([])).toEqual([...NAV_PUBLIK_BAWAAN]);
    expect(bangunNavPublik([menu({ nama: "Kosong", link: "bukan-link" })])).toEqual([
      ...NAV_PUBLIK_BAWAAN,
    ]);
  });
});
