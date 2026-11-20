import { describe, expect, it } from "vitest";

import { klasifikasiJenisDomain } from "./jenis-domain";

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
