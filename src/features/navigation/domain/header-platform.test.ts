import { describe, expect, it } from "vitest";

import { HEADER_PLATFORM, headerPlatform } from "./header-platform";
import { MENU_PLATFORM } from "./menu-platform";

describe("HEADER_PLATFORM", () => {
  it("menyediakan header untuk setiap menu konsol", () => {
    for (const menu of MENU_PLATFORM) {
      expect(HEADER_PLATFORM[menu.href], `header untuk ${menu.href}`).toBeDefined();
    }
  });

  it("memakai eyebrow dan deskripsi yang terisi", () => {
    for (const header of Object.values(HEADER_PLATFORM)) {
      expect(header.eyebrow.length).toBeGreaterThan(0);
      expect(header.title.length).toBeGreaterThan(0);
      expect(header.description.length).toBeGreaterThan(0);
    }
  });
});

describe("headerPlatform", () => {
  it("mengembalikan header rute yang tepat", () => {
    expect(headerPlatform("/super-admin/audit").title).toBe("Audit trail");
    expect(headerPlatform("/super-admin").title).toBe("Ringkasan platform");
  });

  it("memakai header menu induk untuk sub-rute", () => {
    expect(headerPlatform("/super-admin/tenant/12").title).toBe("Konsol tenant");
  });

  it("menampilkan Desa & Domain sebagai remah Daftar domain", () => {
    expect(headerPlatform("/super-admin/domain").remah).toEqual([{ label: "Desa & Domain" }]);
    expect(headerPlatform("/super-admin/domain").title).toBe("Daftar domain");
  });

  it("memberi breadcrumb Tambah Domain tanpa memakai header Daftar domain", () => {
    const header = headerPlatform("/super-admin/domain/tambah");

    expect(header.title).toBe("Tambah Domain");
    expect(header.description).toBe(
      "Daftarkan subdomain atau custom domain baru untuk tenant desa.",
    );
    expect(header.remah).toEqual([
      { label: "Desa & Domain" },
      { label: "Daftar Domain", href: "/super-admin/domain" },
    ]);
  });

  it("jatuh ke ringkasan untuk pathname yang tidak dikenal", () => {
    expect(headerPlatform("/super-admin/tidak-ada").title).toBe("Ringkasan platform");
  });
});
