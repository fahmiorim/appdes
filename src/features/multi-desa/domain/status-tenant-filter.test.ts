import { describe, expect, it } from "vitest";

import { cocokStatusTenant, parseStatusTenantFilter } from "./status-tenant-filter";

describe("parseStatusTenantFilter", () => {
  it("menerima nilai filter yang dikenal", () => {
    expect(parseStatusTenantFilter("aktif")).toBe("aktif");
    expect(parseStatusTenantFilter("nonaktif")).toBe("nonaktif");
    expect(parseStatusTenantFilter("siap-purge")).toBe("siap-purge");
    expect(parseStatusTenantFilter("semua")).toBe("semua");
  });

  it("jatuh ke semua untuk nilai kosong atau asing", () => {
    expect(parseStatusTenantFilter(undefined)).toBe("semua");
    expect(parseStatusTenantFilter("")).toBe("semua");
    expect(parseStatusTenantFilter("purge-semua")).toBe("semua");
    expect(parseStatusTenantFilter("AKTIF")).toBe("semua");
  });

  it("memakai nilai pertama bila parameter berulang", () => {
    expect(parseStatusTenantFilter(["nonaktif", "aktif"])).toBe("nonaktif");
  });
});

describe("cocokStatusTenant", () => {
  it("semua menerima desa apa pun", () => {
    expect(cocokStatusTenant({ active: true, statusRetensi: "aktif" }, "semua")).toBe(true);
    expect(cocokStatusTenant({ active: false, statusRetensi: "sudah-purge" }, "semua")).toBe(true);
  });

  it("aktif hanya untuk desa aktif yang belum di-purge", () => {
    expect(cocokStatusTenant({ active: true, statusRetensi: "aktif" }, "aktif")).toBe(true);
    expect(cocokStatusTenant({ active: false, statusRetensi: "masa-tenggang" }, "aktif")).toBe(
      false,
    );
  });

  it("nonaktif mencakup masa tenggang dan siap purge, bukan yang sudah di-purge", () => {
    expect(cocokStatusTenant({ active: false, statusRetensi: "masa-tenggang" }, "nonaktif")).toBe(
      true,
    );
    expect(cocokStatusTenant({ active: false, statusRetensi: "siap-purge" }, "nonaktif")).toBe(
      true,
    );
    expect(cocokStatusTenant({ active: false, statusRetensi: "sudah-purge" }, "nonaktif")).toBe(
      false,
    );
    expect(cocokStatusTenant({ active: true, statusRetensi: "aktif" }, "nonaktif")).toBe(false);
  });

  it("siap-purge hanya untuk desa yang masa tenggangnya selesai", () => {
    expect(cocokStatusTenant({ active: false, statusRetensi: "siap-purge" }, "siap-purge")).toBe(
      true,
    );
    expect(cocokStatusTenant({ active: false, statusRetensi: "masa-tenggang" }, "siap-purge")).toBe(
      false,
    );
  });
});
