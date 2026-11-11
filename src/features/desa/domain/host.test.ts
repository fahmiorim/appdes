import { describe, expect, it } from "vitest";

import { hostCandidates, normalizeHost } from "./host";

describe("normalizeHost", () => {
  it("menormalkan huruf, spasi, port, dan titik akhir", () => {
    expect(normalizeHost("  Desa.Example.id:3000 ")).toBe("desa.example.id");
    expect(normalizeHost("desa.example.id.")).toBe("desa.example.id");
  });

  it("menangani IPv6 literal", () => {
    expect(normalizeHost("[::1]:3000")).toBe("::1");
    expect(normalizeHost("[2001:db8::1]")).toBe("2001:db8::1");
  });

  it("mengembalikan string kosong untuk host kosong", () => {
    expect(normalizeHost(null)).toBe("");
    expect(normalizeHost(undefined)).toBe("");
    expect(normalizeHost("   ")).toBe("");
  });
});

describe("hostCandidates", () => {
  it("menambahkan alias tanpa www", () => {
    expect(hostCandidates("www.desa.id:3000")).toEqual(["www.desa.id", "desa.id"]);
  });

  it("tidak menduplikasi host tanpa www", () => {
    expect(hostCandidates("desa.id")).toEqual(["desa.id"]);
  });

  it("mengembalikan daftar kosong untuk host kosong", () => {
    expect(hostCandidates("")).toEqual([]);
  });
});
