import { describe, expect, it } from "vitest";

import { grupMenuPlatform, MENU_PLATFORM, menuPlatformAktif } from "./menu-platform";

describe("menuPlatformAktif", () => {
  it("hanya menandai Ringkasan aktif tepat di /super-admin", () => {
    expect(menuPlatformAktif("/super-admin", "/super-admin")).toBe(true);
    expect(menuPlatformAktif("/super-admin", "/super-admin/tenant")).toBe(false);
  });

  it("menandai halaman menu aktif pada sub-rutenya", () => {
    expect(menuPlatformAktif("/super-admin/domain", "/super-admin/domain")).toBe(true);
    expect(menuPlatformAktif("/super-admin/domain", "/super-admin/domain/12")).toBe(true);
    expect(menuPlatformAktif("/super-admin/tenant", "/super-admin/domain")).toBe(false);
  });

  it("tidak salah mencocokkan prefiks yang mirip", () => {
    expect(menuPlatformAktif("/super-admin/audit", "/super-admin/audit-lain")).toBe(false);
  });
});

describe("MENU_PLATFORM", () => {
  it("memuat keenam menu konsol dengan tautan unik", () => {
    expect(MENU_PLATFORM).toHaveLength(6);
    expect(new Set(MENU_PLATFORM.map((item) => item.href)).size).toBe(6);
    expect(MENU_PLATFORM[0]?.href).toBe("/super-admin");
    expect(MENU_PLATFORM.every((item) => item.href.startsWith("/super-admin"))).toBe(true);
  });

  it("memberi grup berlabel pada setiap item", () => {
    expect(MENU_PLATFORM.every((item) => item.grup.trim().length > 0)).toBe(true);
  });

  it("menyediakan submenu Daftar domain di bawah Desa & Domain", () => {
    const desaDomain = MENU_PLATFORM.find((item) => item.href === "/super-admin/domain");

    expect(desaDomain?.label).toBe("Desa & Domain");
    expect(desaDomain?.submenu).toEqual([{ href: "/super-admin/domain", label: "Daftar domain" }]);
    expect(desaDomain?.submenu?.every((item) => item.href.startsWith("/super-admin"))).toBe(true);
    expect(MENU_PLATFORM.some((item) => item.href === "/super-admin/tenant")).toBe(false);
  });

  it("menautkan katalog, penggunaan, dan fondasi template pada submenu", () => {
    const template = MENU_PLATFORM.find((item) => item.href === "/super-admin/template");
    expect(template?.submenu?.map((item) => item.href)).toEqual([
      "/super-admin/template",
      "/super-admin/template/penggunaan",
      "/super-admin/template/fondasi",
    ]);
  });
});

describe("grupMenuPlatform", () => {
  it("mengelompokkan menu sesuai urutan tanpa kehilangan item", () => {
    const grup = grupMenuPlatform();

    expect(grup.map((kelompok) => kelompok.grup)).toEqual([
      "Menu utama",
      "Desa & Domain",
      "Platform",
    ]);
    expect(grup.flatMap((kelompok) => kelompok.item)).toHaveLength(MENU_PLATFORM.length);
  });
});
