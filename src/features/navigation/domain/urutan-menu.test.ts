import { describe, expect, it } from "vitest";

import { normalisasiUrutanMenu, susunMenuPersonal, validasiUrutanMenu } from "./urutan-menu";

const menu = [{ slug: "beranda" }, { slug: "penduduk" }, { slug: "surat" }, { slug: "inventaris" }];

describe("susunMenuPersonal", () => {
  it("menaruh menu tersimpan lebih dulu sesuai urutan pilihan", () => {
    expect(susunMenuPersonal(menu, ["surat", "beranda"]).map((item) => item.slug)).toEqual([
      "surat",
      "beranda",
      "penduduk",
      "inventaris",
    ]);
  });

  it("mengabaikan slug duplikat dan slug yang tidak ada", () => {
    expect(
      susunMenuPersonal(menu, ["surat", "surat", "menu-lama", "penduduk"]).map((item) => item.slug),
    ).toEqual(["surat", "penduduk", "beranda", "inventaris"]);
  });

  it("mempertahankan urutan bawaan bila preferensi kosong", () => {
    expect(susunMenuPersonal(menu, []).map((item) => item.slug)).toEqual([
      "beranda",
      "penduduk",
      "surat",
      "inventaris",
    ]);
  });
});

describe("normalisasiUrutanMenu", () => {
  it("membuang slug kosong, duplikat, dan yang tidak diizinkan", () => {
    expect(normalisasiUrutanMenu(menu, [" surat ", "", "surat", "rahasia", "penduduk"])).toEqual([
      "surat",
      "penduduk",
    ]);
  });
});

describe("validasiUrutanMenu", () => {
  it("menerima urutan menu yang boleh dibaca dan menghapus duplikat", () => {
    expect(validasiUrutanMenu(menu, ["surat", "surat", "penduduk"])).toEqual(["surat", "penduduk"]);
  });

  it("menolak menu yang tidak tersedia untuk akun", () => {
    expect(() => validasiUrutanMenu(menu, ["rahasia"])).toThrow("tidak tersedia");
  });

  it("menolak slug kosong", () => {
    expect(() => validasiUrutanMenu(menu, ["  "])).toThrow("tidak valid");
  });
});
