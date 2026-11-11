import { describe, expect, it } from "vitest";

import {
  bangunNomorRtm,
  isKepalaRtm,
  RTM_LEVEL_ANGGOTA,
  RTM_LEVEL_KEPALA,
  rtmLevelLabel,
  rumahTanggaFormSchema,
} from "@/features/rumah-tangga/domain/rumah-tangga";
import { NO_SELECTION } from "@/lib/forms";

const minimalInput = {
  alamat: "",
  regionId: "",
  kelasSosial: "",
  bdt: "",
};

describe("rumahTanggaFormSchema", () => {
  it("menerima input valid dan memangkas spasi", () => {
    const result = rumahTanggaFormSchema.parse({
      alamat: "  Jl. Melati No. 3 ",
      regionId: "2",
      kelasSosial: "3",
      bdt: " 1234567890 ",
    });

    expect(result.alamat).toBe("Jl. Melati No. 3");
    expect(result.regionId).toBe(2);
    expect(result.kelasSosial).toBe(3);
    expect(result.bdt).toBe("1234567890");
  });

  it("mengubah pilihan kosong menjadi null", () => {
    const result = rumahTanggaFormSchema.parse({ ...minimalInput, regionId: NO_SELECTION });

    expect(result.regionId).toBeNull();
    expect(result.kelasSosial).toBeNull();
  });

  it("menormalkan seluruh isian kosong menjadi null / string kosong", () => {
    const result = rumahTanggaFormSchema.parse(minimalInput);

    expect(result.regionId).toBeNull();
    expect(result.kelasSosial).toBeNull();
    expect(result.alamat).toBe("");
    expect(result.bdt).toBe("");
  });

  it("menolak kelas sosial di luar 0–99", () => {
    expect(rumahTanggaFormSchema.safeParse({ ...minimalInput, kelasSosial: "100" }).success).toBe(
      false,
    );
    expect(rumahTanggaFormSchema.safeParse({ ...minimalInput, kelasSosial: "-1" }).success).toBe(
      false,
    );
  });

  it("menolak alamat yang terlalu panjang", () => {
    const tooLong = "a".repeat(256);
    expect(rumahTanggaFormSchema.safeParse({ ...minimalInput, alamat: tooLong }).success).toBe(
      false,
    );
  });
});

describe("bangunNomorRtm", () => {
  it("menggabungkan kode desa dengan nomor urut 5 digit", () => {
    expect(bangunNomorRtm("3201012001", 1)).toBe("320101200100001");
    expect(bangunNomorRtm("3201012001", 42)).toBe("320101200100042");
  });

  it("memakai nomor urut saja bila kode desa kosong", () => {
    expect(bangunNomorRtm(null, 7)).toBe("00007");
    expect(bangunNomorRtm("", 7)).toBe("00007");
  });

  it("membersihkan kode desa dari karakter non-angka", () => {
    expect(bangunNomorRtm("32.01.01.2001", 1)).toBe("320101200100001");
  });

  it("tidak pernah menghasilkan nomor urut nol atau negatif", () => {
    expect(bangunNomorRtm("32", 0)).toBe("3200001");
    expect(bangunNomorRtm("32", -5)).toBe("3200001");
  });

  it("membulatkan nomor urut pecahan", () => {
    expect(bangunNomorRtm("32", 3.9)).toBe("3200003");
  });
});

describe("pembantu tingkat rumah tangga", () => {
  it("melabeli tingkat yang dikenal", () => {
    expect(rtmLevelLabel(RTM_LEVEL_KEPALA)).toBe("Kepala Rumah Tangga");
    expect(rtmLevelLabel(RTM_LEVEL_ANGGOTA)).toBe("Anggota");
  });

  it("memakai tanda hubung untuk tingkat yang belum diisi atau tak dikenal", () => {
    expect(rtmLevelLabel(null)).toBe("-");
    expect(rtmLevelLabel(99)).toBe("-");
  });

  it("mengenali kepala rumah tangga", () => {
    expect(isKepalaRtm(RTM_LEVEL_KEPALA)).toBe(true);
    expect(isKepalaRtm(RTM_LEVEL_ANGGOTA)).toBe(false);
    expect(isKepalaRtm(null)).toBe(false);
  });
});
