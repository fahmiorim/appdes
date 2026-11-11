import { describe, expect, it } from "vitest";

import { profilDesaFormSchema } from "./profil";

const PROFIL_VALID = {
  visi: "Desa maju dan mandiri.",
  misi: "Meningkatkan pelayanan.\nMengembangkan ekonomi lokal.",
  sejarah: "<p>Sejarah desa.</p>",
  sambutan: "<p>Selamat datang.</p>",
  koordinat: "-6.2, 106.816666",
};

describe("profilDesaFormSchema", () => {
  it("menerima profil lengkap dengan koordinat valid", () => {
    const hasil = profilDesaFormSchema.safeParse(PROFIL_VALID);

    expect(hasil.success).toBe(true);
  });

  it("mengizinkan seluruh isian kosong", () => {
    const hasil = profilDesaFormSchema.safeParse({
      visi: "",
      misi: "",
      sejarah: "",
      sambutan: "",
      koordinat: "",
    });

    expect(hasil.success).toBe(true);
  });

  it("menolak koordinat yang tidak berformat lintang, bujur", () => {
    expect(
      profilDesaFormSchema.safeParse({ ...PROFIL_VALID, koordinat: "106.816666" }).success,
    ).toBe(false);
    expect(profilDesaFormSchema.safeParse({ ...PROFIL_VALID, koordinat: "abc, def" }).success).toBe(
      false,
    );
  });

  it("menerima koordinat dengan spasi dan tanda minus", () => {
    expect(
      profilDesaFormSchema.safeParse({ ...PROFIL_VALID, koordinat: " -6.2 , 106.8 " }).success,
    ).toBe(true);
  });
});
