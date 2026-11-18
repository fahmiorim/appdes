import { describe, expect, it } from "vitest";

import { pathMenu, ratakanMenu, ruteTersedia, type MenuNodeLike } from "./menu-tampil";

function simpul(p: Partial<MenuNodeLike> & Pick<MenuNodeLike, "label">): MenuNodeLike {
  return { label: p.label, url: p.url ?? null, children: p.children ?? [] };
}

describe("pathMenu", () => {
  it("membuang query dan garis miring di akhir", () => {
    expect(pathMenu("/penduduk/?page=2")).toBe("/penduduk");
    expect(pathMenu("/penduduk")).toBe("/penduduk");
  });

  it("mengembalikan null untuk url kosong", () => {
    expect(pathMenu(null)).toBeNull();
    expect(pathMenu("")).toBeNull();
  });

  it("mempertahankan root", () => {
    expect(pathMenu("/")).toBe("/");
  });
});

describe("ruteTersedia", () => {
  it("menerima rute admin yang punya halaman", () => {
    expect(ruteTersedia("/beranda")).toBe(true);
    expect(ruteTersedia("/super-admin")).toBe(true);
    expect(ruteTersedia("/beranda?tab=ringkasan")).toBe(true);
    expect(ruteTersedia("/penduduk")).toBe(true);
    expect(ruteTersedia("/konten/berita")).toBe(true);
  });

  it("menolak rute yang belum punya halaman", () => {
    expect(ruteTersedia("/penduduk/tambah")).toBe(false);
    expect(ruteTersedia("/keuangan/laporan")).toBe(false);
    expect(ruteTersedia(null)).toBe(false);
  });
});

describe("ratakanMenu", () => {
  it("menjadikan simpul beranak sebagai grup lalu menelusuri anaknya", () => {
    const menu = [
      simpul({
        label: "Kependudukan",
        children: [
          simpul({ label: "Beranda", url: "/beranda" }),
          simpul({ label: "Data Penduduk", url: "/penduduk" }),
        ],
      }),
    ];

    expect(ratakanMenu(menu)).toEqual([
      { kind: "grup", label: "Kependudukan", url: null, tersedia: false },
      { kind: "item", label: "Beranda", url: "/beranda", tersedia: true },
      { kind: "item", label: "Data Penduduk", url: "/penduduk", tersedia: true },
    ]);
  });

  it("menandai daun tanpa url sebagai tidak tersedia", () => {
    expect(ratakanMenu([simpul({ label: "Tanpa URL" })])).toEqual([
      { kind: "item", label: "Tanpa URL", url: null, tersedia: false },
    ]);
  });

  it("mengembalikan daftar kosong untuk menu kosong", () => {
    expect(ratakanMenu([])).toEqual([]);
  });
});
