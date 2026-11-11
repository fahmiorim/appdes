import { describe, expect, it } from "vitest";

import { indikatorAnalisisSchema, kategoriAnalisisSchema } from "./analisis";

describe("kategoriAnalisisSchema", () => {
  it("menerima nama valid", () => {
    const result = kategoriAnalisisSchema.parse({ nama: "Ekonomi" });
    expect(result.nama).toBe("Ekonomi");
  });

  it("menolak nama kosong", () => {
    expect(() => kategoriAnalisisSchema.parse({ nama: "" })).toThrow();
  });

  it("menolak nama whitespace", () => {
    expect(() => kategoriAnalisisSchema.parse({ nama: "   " })).toThrow();
  });

  it("menerima keterangan null", () => {
    const result = kategoriAnalisisSchema.parse({ nama: "Sosial", keterangan: null });
    expect(result.keterangan).toBeNull();
  });

  it("menerima keterangan opsional (tidak disertakan)", () => {
    const result = kategoriAnalisisSchema.parse({ nama: "Sosial" });
    expect(result.keterangan).toBeUndefined();
  });

  it("mem-trim nama", () => {
    const result = kategoriAnalisisSchema.parse({ nama: "  Ekonomi  " });
    expect(result.nama).toBe("Ekonomi");
  });

  it("menolak nama > 100 karakter", () => {
    expect(() => kategoriAnalisisSchema.parse({ nama: "a".repeat(101) })).toThrow();
  });
});

describe("indikatorAnalisisSchema", () => {
  it("menerima kode + nama valid", () => {
    const result = indikatorAnalisisSchema.parse({ kode: "K01", nama: "PDB per Kapita" });
    expect(result.kode).toBe("K01");
    expect(result.nama).toBe("PDB per Kapita");
  });

  it("bobot default 1 jika kosong", () => {
    const result = indikatorAnalisisSchema.parse({ kode: "K01", nama: "Test" });
    expect(result.bobot).toBe(1);
  });

  it("bobot default 1 jika null", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
      bobot: null,
    });
    expect(result.bobot).toBe(1);
  });

  it("bobot default 1 jika undefined", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
      bobot: undefined,
    });
    expect(result.bobot).toBe(1);
  });

  it("bobot default 1 jika string kosong", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
      bobot: "",
    });
    expect(result.bobot).toBe(1);
  });

  it("menerima bobot min 1", () => {
    const result = indikatorAnalisisSchema.parse({ kode: "K01", nama: "Test", bobot: 1 });
    expect(result.bobot).toBe(1);
  });

  it("menerima bobot max 100", () => {
    const result = indikatorAnalisisSchema.parse({ kode: "K01", nama: "Test", bobot: 100 });
    expect(result.bobot).toBe(100);
  });

  it("menolak bobot < 1", () => {
    expect(() => indikatorAnalisisSchema.parse({ kode: "K01", nama: "Test", bobot: 0 })).toThrow();
  });

  it("menolak bobot > 100", () => {
    expect(() =>
      indikatorAnalisisSchema.parse({ kode: "K01", nama: "Test", bobot: 101 }),
    ).toThrow();
  });

  it("kategoriId null → null", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
      kategoriId: null,
    });
    expect(result.kategoriId).toBeNull();
  });

  it("kategoriId undefined → null", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
    });
    expect(result.kategoriId).toBeNull();
  });

  it("kategoriId '' → null", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
      kategoriId: "",
    });
    expect(result.kategoriId).toBeNull();
  });

  it("menolak kategoriId bukan angka valid", () => {
    expect(() =>
      indikatorAnalisisSchema.parse({
        kode: "K01",
        nama: "Test",
        kategoriId: "abc",
      }),
    ).toThrow();
  });

  it("keterangan opsional → null jika kosong", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
      keterangan: "",
    });
    expect(result.keterangan).toBeNull();
  });

  it("keterangan opsional → null jika tidak disertakan", () => {
    const result = indikatorAnalisisSchema.parse({
      kode: "K01",
      nama: "Test",
    });
    expect(result.keterangan).toBeUndefined();
  });

  it("mem-trim kode", () => {
    const result = indikatorAnalisisSchema.parse({ kode: "  K01  ", nama: "Test" });
    expect(result.kode).toBe("K01");
  });

  it("mem-trim nama", () => {
    const result = indikatorAnalisisSchema.parse({ kode: "K01", nama: "  Test  " });
    expect(result.nama).toBe("Test");
  });

  it("menolak kode kosong", () => {
    expect(() => indikatorAnalisisSchema.parse({ kode: "", nama: "Test" })).toThrow();
  });

  it("menolak nama kosong", () => {
    expect(() => indikatorAnalisisSchema.parse({ kode: "K01", nama: "" })).toThrow();
  });
});
