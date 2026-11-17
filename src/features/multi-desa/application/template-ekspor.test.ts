import { describe, expect, it } from "vitest";

import {
  parseArgumen,
  susunTemplate,
  type MasukanTemplate,
} from "../../../../scripts/platform/export-template.mjs";

const TANGGAL = new Date("2026-11-17T03:00:00.000Z");

function masukan(overrides: Partial<MasukanTemplate> = {}): MasukanTemplate {
  return {
    desa: { id: 7, slug: "desa-sukamaju", name: "Desa Sukamaju" },
    roles: [
      { slug: "administrator", name: "Administrator", is_system: 1 },
      { slug: "operator", name: "Operator", is_system: 0 },
    ],
    modules: [
      {
        id: 10,
        slug: "beranda",
        name: "Beranda",
        url: "/beranda",
        icon: null,
        is_group: 0,
        is_hidden: 0,
        is_active: 1,
        sort_order: 0,
        parent_id: 0,
      },
      {
        id: 11,
        slug: "laporan",
        name: "Laporan",
        url: "/laporan",
        icon: "chart",
        is_group: 0,
        is_hidden: 0,
        is_active: 1,
        sort_order: 1,
        parent_id: 10,
      },
      {
        id: 12,
        slug: "yatim-induk",
        name: "Yatim Induk",
        url: null,
        icon: "",
        is_group: 0,
        is_hidden: 1,
        is_active: 0,
        sort_order: 2,
        parent_id: 99,
      },
    ],
    akses: [
      { role_slug: "administrator", module_slug: "beranda", access: "manage" },
      { role_slug: "administrator", module_slug: "beranda", access: "read" },
      { role_slug: "operator", module_slug: "laporan", access: "read" },
      { role_slug: "kades", module_slug: "beranda", access: "read" },
      { role_slug: "administrator", module_slug: "modul-lain", access: "read" },
    ],
    tema: { slug: "esensi", nama: "Esensi", versi: "1.0.0", opsi: null },
    menuPublik: [
      { nama: "Beranda", link: "/", link_tipe: "internal", aktif: 1, urut: 0, parent_id: null },
      {
        nama: "Layanan",
        link: "https://layanan.contoh.id",
        link_tipe: "eksternal",
        aktif: 0,
        urut: 1,
        parent_id: null,
      },
      { nama: "Anak", link: "/anak", link_tipe: "internal", aktif: 1, urut: 0, parent_id: 5 },
    ],
    tanggal: TANGGAL,
    ...overrides,
  };
}

describe("parseArgumen", () => {
  it("memakai nilai bawaan tanpa argumen", () => {
    expect(parseArgumen([])).toEqual({
      village: null,
      out: null,
      force: false,
      json: false,
      help: false,
    });
  });

  it("membaca seluruh opsi", () => {
    expect(
      parseArgumen(["--village", " desa-sukamaju ", "--out", "t.json", "--force", "--json"]),
    ).toEqual({
      village: "desa-sukamaju",
      out: "t.json",
      force: true,
      json: true,
      help: false,
    });
  });

  it("menolak argumen tidak dikenal", () => {
    expect(() => parseArgumen(["--paksa"])).toThrow(/tidak dikenal/);
  });

  it("menolak opsi tanpa nilai", () => {
    expect(() => parseArgumen(["--village"])).toThrow(/membutuhkan nilai/);
    expect(() => parseArgumen(["--out", "--json"])).toThrow(/membutuhkan nilai/);
  });

  it("menolak --json tanpa --out", () => {
    expect(() => parseArgumen(["--json"])).toThrow(/membutuhkan --out/);
  });
});

describe("susunTemplate", () => {
  it("memetakan baris tenant menjadi template berkunci slug", () => {
    const { template, ringkasan } = susunTemplate(masukan());

    expect(template.versi).toBe(1);
    expect(template.sumber).toEqual({
      jenis: "ekspor",
      villageId: 7,
      dibuatPada: "2026-11-17",
    });
    expect(template.roles).toEqual([
      { slug: "administrator", name: "Administrator", isSystem: true },
      { slug: "operator", name: "Operator", isSystem: false },
    ]);

    expect(template.modules[1]).toMatchObject({
      slug: "laporan",
      parentSlug: "beranda",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 1,
    });
    // Induk yang tidak ada di tenant diperlakukan sebagai modul tingkat atas.
    expect(template.modules[2]?.parentSlug).toBeNull();

    // Akses ganda, role asing, dan modul asing tidak masuk template.
    expect(template.akses).toEqual([
      { roleSlug: "administrator", moduleSlug: "beranda", access: "manage" },
      { roleSlug: "operator", moduleSlug: "laporan", access: "read" },
    ]);

    expect(template.tema).toEqual({ slug: "esensi", nama: "Esensi", versi: "1.0.0", opsi: null });

    expect(template.menuPublik).toEqual([
      { nama: "Beranda", link: "/", linkTipe: "internal", aktif: true, urut: 0 },
      {
        nama: "Layanan",
        link: "https://layanan.contoh.id",
        linkTipe: "eksternal",
        aktif: false,
        urut: 1,
      },
    ]);
    expect(ringkasan).toEqual({
      desa: { id: 7, slug: "desa-sukamaju", name: "Desa Sukamaju" },
      roles: 2,
      modules: 3,
      akses: 2,
      menuPublik: 2,
      menuAnakDiabaikan: 1,
      tema: "esensi",
    });
  });

  it("menolak desa referensi tanpa role administrator", () => {
    expect(() =>
      susunTemplate(masukan({ roles: [{ slug: "operator", name: "Operator", is_system: 0 }] })),
    ).toThrow(/administrator/);
  });

  it("menghasilkan tema null bila desa belum punya tema aktif", () => {
    const { template } = susunTemplate(masukan({ tema: null }));

    expect(template.tema).toBeNull();
  });
});
