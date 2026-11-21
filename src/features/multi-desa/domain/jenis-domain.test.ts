import { describe, expect, it } from "vitest";

import { klasifikasiJenisDomain, susunSubdomainPlatform } from "./jenis-domain";

describe("susunSubdomainPlatform", () => {
  it("menggabungkan slug dan base domain", () => {
    expect(susunSubdomainPlatform("sukamaju", "desa.id")).toBe("sukamaju.desa.id");
    expect(susunSubdomainPlatform(" Sukamaju ", "*.Desa.ID.")).toBe("sukamaju.desa.id");
  });

  it("tidak mengarang host bila slug atau base domain kosong", () => {
    expect(susunSubdomainPlatform(null, "desa.id")).toBeNull();
    expect(susunSubdomainPlatform("sukamaju", null)).toBeNull();
    expect(susunSubdomainPlatform("sukamaju", " ")).toBeNull();
  });
});

describe("klasifikasiJenisDomain", () => {
  it("mengenali slug desa di bawah base domain sebagai subdomain", () => {
    expect(klasifikasiJenisDomain("sukamaju.desa.id", "desa.id", "sukamaju")).toBe("subdomain");
  });

  it("menandai host lain sebagai custom", () => {
    expect(klasifikasiJenisDomain("sukamaju.go.id", "desa.id", "sukamaju")).toBe("custom");
    expect(klasifikasiJenisDomain("lain.desa.id", "desa.id", "sukamaju")).toBe("custom");
  });

  it("tidak mengarang saat base domain atau slug belum diisi", () => {
    expect(klasifikasiJenisDomain("sukamaju.desa.id", null, "sukamaju")).toBe("custom");
    expect(klasifikasiJenisDomain("sukamaju.desa.id", "desa.id", null)).toBe("custom");
  });
});
