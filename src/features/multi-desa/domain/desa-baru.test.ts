import { describe, expect, it } from "vitest";

import { desaBaruSchema, normalisasiDomain } from "./desa-baru";

const dasar = {
  name: "Desa Sukamaju",
  code: "3201012001",
  adminName: "Admin Desa",
  adminUsername: "admin.sukamaju",
  adminEmail: "admin@sukamaju.id",
  adminPassword: "Rahasia#123",
};

describe("normalisasiDomain", () => {
  it("membuang protokol, path, dan huruf besar", () => {
    expect(normalisasiDomain("https://Desa-Sukamaju.id/beranda")).toBe("desa-sukamaju.id");
    expect(normalisasiDomain("  desa.id  ")).toBe("desa.id");
  });

  it("mengembalikan null untuk string kosong", () => {
    expect(normalisasiDomain("   ")).toBeNull();
  });
});

describe("desaBaruSchema", () => {
  it("menerima input lengkap dan menormalkan domain", () => {
    const hasil = desaBaruSchema.parse({ ...dasar, domain: "https://Sukamaju.id/" });

    expect(hasil.domain).toBe("sukamaju.id");
    expect(hasil.adminUsername).toBe("admin.sukamaju");
  });

  it("menerima domain kosong sebagai desa tanpa domain", () => {
    expect(desaBaruSchema.parse({ ...dasar, domain: "" }).domain).toBeNull();
  });

  it("menolak kode desa yang bukan 10 digit", () => {
    expect(() => desaBaruSchema.parse({ ...dasar, code: "123" })).toThrow();
  });

  it("menyimpan kode wilayah picker sebagai digit sesuai panjang kolom", () => {
    const hasil = desaBaruSchema.parse({
      ...dasar,
      domain: "",
      provinceCode: "11",
      regencyCode: "11.01",
      districtCode: "11.01.01",
    });

    expect(hasil.provinceCode).toBe("11");
    expect(hasil.regencyCode).toBe("1101");
    expect(hasil.districtCode).toBe("110101");
  });

  it("menerima kode wilayah kosong dan menolak panjang yang salah", () => {
    expect(
      desaBaruSchema.parse({ ...dasar, domain: "", provinceCode: "" }).provinceCode,
    ).toBeUndefined();
    expect(() => desaBaruSchema.parse({ ...dasar, domain: "", provinceCode: "111" })).toThrow();
  });

  it("menolak domain dengan protokol yang tersisa setelah normalisasi", () => {
    expect(() => desaBaruSchema.parse({ ...dasar, domain: "bukan domain" })).toThrow();
  });

  it("menolak sandi admin yang terlalu pendek", () => {
    expect(() => desaBaruSchema.parse({ ...dasar, adminPassword: "123" })).toThrow();
  });
});
