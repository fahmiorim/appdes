import { describe, expect, it } from "vitest";

import { grupMenuPlatform, MENU_PLATFORM, menuPlatformAktif } from "./menu-platform";

describe("menuPlatformAktif", () => {
  it("hanya menandai Ringkasan aktif tepat di /super-admin", () => {
    expect(menuPlatformAktif("/super-admin", "/super-admin")).toBe(true);
    expect(menuPlatformAktif("/super-admin", "/super-admin/tenant")).toBe(false);
  });

  it("menandai halaman menu aktif pada sub-rutenya", () => {
    expect(menuPlatformAktif("/super-admin/tenant", "/super-admin/tenant")).toBe(true);
    expect(menuPlatformAktif("/super-admin/tenant", "/super-admin/tenant/12")).toBe(true);
    expect(menuPlatformAktif("/super-admin/domain", "/super-admin/tenant")).toBe(false);
  });

  it("tidak salah mencocokkan prefiks yang mirip", () => {
    expect(menuPlatformAktif("/super-admin/audit", "/super-admin/audit-lain")).toBe(false);
  });
});

describe("MENU_PLATFORM", () => {
  it("memuat ketujuh menu konsol dengan tautan unik", () => {
    expect(MENU_PLATFORM).toHaveLength(7);
    expect(new Set(MENU_PLATFORM.map((item) => item.href)).size).toBe(7);
    expect(MENU_PLATFORM[0]?.href).toBe("/super-admin");
    expect(MENU_PLATFORM.every((item) => item.href.startsWith("/super-admin"))).toBe(true);
  });

  it("memberi grup berlabel pada setiap item", () => {
    expect(MENU_PLATFORM.every((item) => item.grup.trim().length > 0)).toBe(true);
  });

  it("menyediakan submenu Daftar tenant di bawah Manajemen tenant", () => {
    const manajemenTenant = MENU_PLATFORM.find((item) => item.href === "/super-admin/tenant");

    expect(manajemenTenant?.label).toBe("Manajemen tenant");
    expect(manajemenTenant?.anak).toEqual([
      { href: "/super-admin/tenant", label: "Daftar tenant" },
    ]);
    expect(manajemenTenant?.anak?.every((item) => item.href.startsWith("/super-admin"))).toBe(true);
  });
});

describe("grupMenuPlatform", () => {
  it("mengelompokkan menu sesuai urutan tanpa kehilangan item", () => {
    const grup = grupMenuPlatform();

    expect(grup.map((kelompok) => kelompok.grup)).toEqual(["Menu utama", "Tenant", "Platform"]);
    expect(grup.flatMap((kelompok) => kelompok.item)).toHaveLength(MENU_PLATFORM.length);
  });
});
