import { describe, expect, it } from "vitest";

import { PUBLIC_NAV, susunMenu, type MenuRowInput } from "./menu";

const menuLama: MenuRowInput[] = [
  { id: 1, nama: "Beranda", link: "/", parentId: null },
  { id: 2, nama: "Profil", link: "/desa/profil", parentId: null },
  { id: 3, nama: "Pemerintahan", link: "/desa/pemerintahan", parentId: null },
  { id: 4, nama: "Berita", link: "/desa/berita", parentId: null },
  { id: 5, nama: "Galeri", link: "/desa/galeri", parentId: null },
  { id: 6, nama: "Statistik", link: "/desa/statistik", parentId: null },
  { id: 7, nama: "APBDes", link: "/desa/apbdes", parentId: null },
  { id: 8, nama: "Informasi Publik", link: "/desa/dokumen", parentId: null },
  { id: 9, nama: "Lapak Desa", link: "/desa/lapak", parentId: null },
  { id: 10, nama: "Pemilihan", link: "/desa/pemilihan", parentId: null },
  { id: 11, nama: "Kontak", link: "/desa/kontak", parentId: null },
];

describe("susunMenu", () => {
  it("meng-upgrade menu seed lama ke navigasi bawaan baru", () => {
    const hasil = susunMenu(menuLama);

    expect(hasil.map((item) => item.label)).toEqual([
      "Beranda",
      "Profil",
      "Layanan",
      "Informasi",
      "Transparansi",
      "Warga",
      "Kontak",
    ]);
    expect(
      hasil.find((item) => item.label === "Informasi")?.children?.map((item) => item.label),
    ).toEqual(["Berita", "Agenda", "Galeri", "Informasi Publik", "Suplemen"]);
    expect(
      hasil.find((item) => item.label === "Layanan")?.children?.map((item) => item.href),
    ).toEqual([
      "/layanan-mandiri",
      "/desa/surat",
      "/desa/kesehatan/kia",
      "/desa/bantuan",
      "/desa/anjungan",
      "/desa/verifikasi-surat",
    ]);
  });

  it("mempertahankan menu yang sudah bertingkat", () => {
    const hasil = susunMenu([
      { id: 1, nama: "Beranda", link: "/", parentId: null },
      { id: 2, nama: "Layanan", link: "/desa/surat", parentId: null },
      { id: 3, nama: "Surat Online", link: "/desa/surat", parentId: 2 },
    ]);

    expect(hasil).toHaveLength(2);
    expect(hasil[1]?.children?.map((item) => item.label)).toEqual(["Surat Online"]);
  });

  it("menghormati menu datar pilihan admin yang ringkas", () => {
    const hasil = susunMenu([
      { id: 1, nama: "Beranda", link: "/", parentId: null },
      { id: 2, nama: "Kontak", link: "/desa/kontak", parentId: null },
    ]);

    expect(hasil.map((item) => item.label)).toEqual(["Beranda", "Kontak"]);
    expect(hasil[0]?.children).toBeUndefined();
  });

  it("menyediakan menu bawaan yang ringkas saat basis data kosong", () => {
    expect(susunMenu([])).toBe(PUBLIC_NAV);
    expect(PUBLIC_NAV).toHaveLength(7);
  });
});
