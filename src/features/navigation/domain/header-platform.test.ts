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
    expect(headerPlatform("/super-admin/tenant/12").title).toBe("Tenant desa");
  });

  it("jatuh ke ringkasan untuk pathname yang tidak dikenal", () => {
    expect(headerPlatform("/super-admin/tidak-ada").title).toBe("Ringkasan platform");
  });
});
