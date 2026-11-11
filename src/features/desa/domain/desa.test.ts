import { describe, expect, it } from "vitest";

import { desaFormSchema, desaLabel } from "@/features/desa/domain/desa";

const minimal = {
  namaDesa: "",
  kodeDesa: "",
  kodePos: "",
  namaKecamatan: "",
  kodeKecamatan: "",
  namaKabupaten: "",
  kodeKabupaten: "",
  namaPropinsi: "",
  kodePropinsi: "",
  alamatKantor: "",
  emailDesa: "",
  telepon: "",
  website: "",
  logo: "",
};

describe("desaFormSchema", () => {
  it("menerima input valid dan memangkas spasi", () => {
    const result = desaFormSchema.parse({
      ...minimal,
      namaDesa: "  Desa Contoh ",
      emailDesa: "  admin@desacontoh.go.id ",
      website: "https://example.com",
    });

    expect(result.namaDesa).toBe("Desa Contoh");
    expect(result.emailDesa).toBe("admin@desacontoh.go.id");
  });

  it("memvalidasi format email", () => {
    expect(desaFormSchema.safeParse({ ...minimal, emailDesa: "bukan-email" }).success).toBe(false);
    expect(desaFormSchema.safeParse({ ...minimal, emailDesa: "admin@example.com" }).success).toBe(
      true,
    );
  });

  it("menerima semua kolom kosong", () => {
    expect(desaFormSchema.parse(minimal)).toBeTruthy();
  });
});

describe("desaLabel", () => {
  it("menyusun label berdasarkan nama dan kode", () => {
    expect(desaLabel({ namaDesa: "Desa Contoh", kodeDesa: "3201012001" })).toBe(
      "Desa Contoh (3201012001)",
    );
    expect(desaLabel({ namaDesa: "Desa Contoh", kodeDesa: null })).toBe("Desa Contoh");
    expect(desaLabel({ namaDesa: null, kodeDesa: "3201012001" })).toBe("3201012001");
    expect(desaLabel({ namaDesa: null, kodeDesa: null })).toBe("Desa");
  });
});
