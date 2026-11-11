import { describe, expect, it } from "vitest";

import {
  genderLabelKk,
  HEAD_OF_FAMILY_RELATION_ID,
  keluargaFormSchema,
  keluargaLabel,
  kepalaKeluarga,
  tanggalKk,
  type KeluargaMemberDetail,
} from "@/features/keluarga/domain/keluarga";
import { NO_SELECTION } from "@/lib/forms";

const minimalInput = {
  number: "3201012001120001",
  address: "",
  regionId: "",
};

describe("keluargaFormSchema", () => {
  it("menerima input valid dan memangkas spasi", () => {
    const result = keluargaFormSchema.parse({
      ...minimalInput,
      number: " 3201012001120001 ",
      address: "  Jl. Melati No. 3 ",
      regionId: "2",
    });

    expect(result.number).toBe("3201012001120001");
    expect(result.address).toBe("Jl. Melati No. 3");
    expect(result.regionId).toBe(2);
  });

  it("mengubah pilihan wilayah kosong menjadi null", () => {
    expect(
      keluargaFormSchema.parse({ ...minimalInput, regionId: NO_SELECTION }).regionId,
    ).toBeNull();
    expect(keluargaFormSchema.parse(minimalInput).regionId).toBeNull();
  });

  it("menerima nomor KK tanpa wilayah", () => {
    const result = keluargaFormSchema.parse(minimalInput);

    expect(result.number).toBe("3201012001120001");
    expect(result.address).toBe("");
  });

  it("menolak nomor KK yang kosong atau bukan 16 angka", () => {
    expect(keluargaFormSchema.safeParse({ ...minimalInput, number: "" }).success).toBe(false);
    expect(keluargaFormSchema.safeParse({ ...minimalInput, number: "123" }).success).toBe(false);
    expect(
      keluargaFormSchema.safeParse({ ...minimalInput, number: "32010120011200AB" }).success,
    ).toBe(false);
  });

  it("menolak alamat yang terlalu panjang", () => {
    expect(
      keluargaFormSchema.safeParse({ ...minimalInput, address: "a".repeat(256) }).success,
    ).toBe(false);
  });
});

describe("pembantu domain keluarga", () => {
  it("menyusun label keluarga dari nomor KK", () => {
    expect(keluargaLabel({ number: "3201012001120001" })).toBe("KK 3201012001120001");
  });

  it("memakai id katalog kepala keluarga yang benar", () => {
    expect(HEAD_OF_FAMILY_RELATION_ID).toBe(1);
  });
});

function anggota(partial: Partial<KeluargaMemberDetail>): KeluargaMemberDetail {
  return {
    id: 1,
    name: "Budi Santoso",
    nationalId: "3201010101850001",
    gender: "male",
    birthDate: "1985-04-12",
    relationName: "KEPALA KELUARGA",
    birthPlace: "Bandung",
    religionName: "ISLAM",
    educationName: "SLTA/SEDERAJAT",
    occupationName: "PETANI",
    maritalStatusName: "KAWIN",
    bloodTypeName: "O",
    citizenshipName: "WNI",
    fatherName: "Ayah Budi",
    motherName: "Ibu Budi",
    ...partial,
  };
}

describe("pembantu cetak Kartu Keluarga", () => {
  it("melabeli jenis kelamin dalam huruf kapital", () => {
    expect(genderLabelKk("male")).toBe("LAKI-LAKI");
    expect(genderLabelKk("female")).toBe("PEREMPUAN");
  });

  it("mengubah tanggal ISO ke format DD-MM-YYYY", () => {
    expect(tanggalKk("1985-04-12")).toBe("12-04-1985");
    expect(tanggalKk("2018-01-05")).toBe("05-01-2018");
  });

  it("mengembalikan null untuk tanggal kosong atau tidak lengkap", () => {
    expect(tanggalKk(null)).toBeNull();
    expect(tanggalKk("1985-04")).toBeNull();
    expect(tanggalKk("")).toBeNull();
  });

  it("menemukan kepala keluarga tanpa terpengaruh besar-kecil huruf", () => {
    const daftar = [
      anggota({ id: 2, name: "Siti", relationName: "ISTRI" }),
      anggota({ id: 1, name: "Budi", relationName: "Kepala Keluarga" }),
    ];

    expect(kepalaKeluarga(daftar)?.name).toBe("Budi");
  });

  it("mengembalikan null bila tidak ada kepala keluarga", () => {
    expect(kepalaKeluarga([anggota({ relationName: "ANAK" })])).toBeNull();
    expect(kepalaKeluarga([])).toBeNull();
  });
});
