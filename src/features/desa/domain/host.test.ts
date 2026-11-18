import { describe, expect, it } from "vitest";

import { adalahHostPlatform, hostCandidates, normalisasiDaftarHost, normalizeHost } from "./host";

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

describe("normalisasiDaftarHost", () => {
  it("menerima daftar dipisah koma dan membuang skema, port, serta duplikat", () => {
    expect(normalisasiDaftarHost(" https://FlexiDesa.test:3000 , www.flexidesa.test ,")).toEqual([
      "flexidesa.test",
      "www.flexidesa.test",
    ]);
    expect(normalisasiDaftarHost("flexidesa.test,flexidesa.test")).toEqual(["flexidesa.test"]);
  });

  it("menerima URL penuh seperti APP_URL", () => {
    expect(normalisasiDaftarHost("http://flexidesa.test:3000")).toEqual(["flexidesa.test"]);
  });

  it("mengembalikan daftar kosong untuk nilai kosong", () => {
    expect(normalisasiDaftarHost(null)).toEqual([]);
    expect(normalisasiDaftarHost("  ")).toEqual([]);
  });
});

describe("adalahHostPlatform", () => {
  const platform = ["flexidesa.test"];

  it("mengenali host platform dan alias www-nya", () => {
    expect(adalahHostPlatform("flexidesa.test:3000", platform)).toBe(true);
    expect(adalahHostPlatform("www.flexidesa.test", platform)).toBe(true);
    expect(adalahHostPlatform("FLEXIDESA.test.:3000", platform)).toBe(true);
  });

  it("menolak subdomain desa dan host lain", () => {
    expect(adalahHostPlatform("kwalagunung.flexidesa.test", platform)).toBe(false);
    expect(adalahHostPlatform("flexidesa.test.evil.example", platform)).toBe(false);
    expect(adalahHostPlatform("127.0.0.1:3000", platform)).toBe(false);
    expect(adalahHostPlatform(null, platform)).toBe(false);
  });

  it("membedakan host platform dari domain induk desa", () => {
    // Produksi: platform `flexidesa.id`, desa `kwalagunung.desa.id`.
    const hostPlatformProduksi = normalisasiDaftarHost("flexidesa.id");

    expect(adalahHostPlatform("flexidesa.id", hostPlatformProduksi)).toBe(true);
    expect(adalahHostPlatform("kwalagunung.desa.id", hostPlatformProduksi)).toBe(false);
    expect(adalahHostPlatform("desa.id", hostPlatformProduksi)).toBe(false);
  });

  it("tidak menganggap host apa pun sebagai platform saat daftar kosong", () => {
    expect(adalahHostPlatform("flexidesa.test", [])).toBe(false);
  });
});
