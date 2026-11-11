import { describe, expect, it } from "vitest";

import {
  anggotaKelompokFormSchema,
  buildKelompokSlug,
  isKelompokTipe,
  isKetuaKelompok,
  JABATAN_KETUA,
  jabatanLabel,
  kategoriKelompokFormSchema,
  KELOMPOK_TIPE,
  kelompokFormSchema,
  kelompokTipeLabel,
} from "@/features/kelompok/domain/kelompok";
import { NO_SELECTION } from "@/lib/forms";

const minimalKelompok = {
  nama: "Karang Taruna",
  tipe: "kelompok",
  kategoriId: "",
  kode: "",
  nomorSk: "",
  keterangan: "",
};

describe("kelompokFormSchema", () => {
  it("menerima input valid dan memangkas spasi", () => {
    const result = kelompokFormSchema.parse({
      nama: "  Karang Taruna  ",
      tipe: "kelompok",
      kategoriId: "3",
      kode: " KT-01 ",
      nomorSk: " SK/001 ",
      keterangan: "  Kelompok pemuda desa  ",
    });

    expect(result.nama).toBe("Karang Taruna");
    expect(result.kategoriId).toBe(3);
    expect(result.kode).toBe("KT-01");
    expect(result.nomorSk).toBe("SK/001");
    expect(result.keterangan).toBe("Kelompok pemuda desa");
  });

  it("menormalkan pilihan kosong menjadi null", () => {
    const result = kelompokFormSchema.parse({ ...minimalKelompok, kategoriId: NO_SELECTION });

    expect(result.kategoriId).toBeNull();
    expect(result.kode).toBe("");
    expect(result.nomorSk).toBe("");
  });

  it("menolak nama kosong", () => {
    expect(kelompokFormSchema.safeParse({ ...minimalKelompok, nama: "   " }).success).toBe(false);
  });

  it("menolak nama yang terlalu panjang", () => {
    expect(
      kelompokFormSchema.safeParse({ ...minimalKelompok, nama: "a".repeat(151) }).success,
    ).toBe(false);
  });

  it("menolak tipe di luar kelompok/lembaga", () => {
    expect(kelompokFormSchema.safeParse({ ...minimalKelompok, tipe: "organisasi" }).success).toBe(
      false,
    );
  });

  it("menerima tipe lembaga", () => {
    const result = kelompokFormSchema.parse({ ...minimalKelompok, tipe: "lembaga" });
    expect(result.tipe).toBe("lembaga");
  });
});

describe("kategoriKelompokFormSchema", () => {
  it("menerima nama dan tipe yang sah", () => {
    const result = kategoriKelompokFormSchema.parse({ nama: " PKK ", tipe: "kelompok" });
    expect(result.nama).toBe("PKK");
    expect(result.tipe).toBe("kelompok");
  });

  it("menolak nama kosong", () => {
    expect(kategoriKelompokFormSchema.safeParse({ nama: "", tipe: "kelompok" }).success).toBe(
      false,
    );
  });

  it("menolak tipe tak dikenal", () => {
    expect(kategoriKelompokFormSchema.safeParse({ nama: "PKK", tipe: "x" }).success).toBe(false);
  });
});

describe("anggotaKelompokFormSchema", () => {
  it("menerima penduduk & jabatan dan memangkas teks", () => {
    const result = anggotaKelompokFormSchema.parse({
      residentId: "12",
      jabatan: "1",
      nomorAnggota: "  A-001 ",
      nomorSk: " SK/002 ",
    });

    expect(result.residentId).toBe(12);
    expect(result.jabatan).toBe(1);
    expect(result.nomorAnggota).toBe("A-001");
    expect(result.nomorSk).toBe("SK/002");
  });

  it("menormalkan pilihan kosong menjadi null", () => {
    const result = anggotaKelompokFormSchema.parse({
      residentId: NO_SELECTION,
      jabatan: NO_SELECTION,
      nomorAnggota: "",
      nomorSk: "",
    });

    expect(result.residentId).toBeNull();
    expect(result.jabatan).toBeNull();
  });

  it("menerima jabatan anggota biasa (90)", () => {
    const result = anggotaKelompokFormSchema.parse({ residentId: "1", jabatan: "90" });
    expect(result.jabatan).toBe(90);
  });
});

describe("buildKelompokSlug", () => {
  it("membentuk slug dari nama", () => {
    expect(buildKelompokSlug("Karang Taruna")).toBe("karang-taruna");
    expect(buildKelompokSlug("  PKK Desa  ")).toBe("pkk-desa");
  });

  it("menggabungkan tanda baca berulang menjadi satu tanda hubung", () => {
    expect(buildKelompokSlug("LPM -- Desa / Sukamaju")).toBe("lpm-desa-sukamaju");
  });

  it("memakai awalan kelompok bila nama tidak menghasilkan slug", () => {
    expect(buildKelompokSlug("!!!")).toBe("kelompok");
    expect(buildKelompokSlug("")).toBe("kelompok");
  });
});

describe("pembantu label & predikat", () => {
  it("melabeli tipe yang dikenal", () => {
    expect(kelompokTipeLabel("kelompok")).toBe("Kelompok Masyarakat");
    expect(kelompokTipeLabel("lembaga")).toBe("Lembaga Desa");
  });

  it("memakai tanda hubung untuk tipe tak dikenal", () => {
    expect(kelompokTipeLabel(null)).toBe("-");
    expect(kelompokTipeLabel("lain")).toBe("-");
  });

  it("mengenali tipe yang sah", () => {
    expect(isKelompokTipe("kelompok")).toBe(true);
    expect(isKelompokTipe("lembaga")).toBe(true);
    expect(isKelompokTipe("lain")).toBe(false);
  });

  it("melabeli jabatan yang dikenal", () => {
    expect(jabatanLabel(1)).toBe("Ketua");
    expect(jabatanLabel(2)).toBe("Wakil Ketua");
    expect(jabatanLabel(3)).toBe("Sekretaris");
    expect(jabatanLabel(4)).toBe("Bendahara");
    expect(jabatanLabel(90)).toBe("Anggota");
  });

  it("memakai tanda hubung untuk jabatan tak dikenal", () => {
    expect(jabatanLabel(null)).toBe("-");
    expect(jabatanLabel(5)).toBe("-");
  });

  it("mengenali ketua kelompok lewat jabatan", () => {
    expect(isKetuaKelompok(JABATAN_KETUA)).toBe(true);
    expect(isKetuaKelompok(90)).toBe(false);
    expect(isKetuaKelompok(null)).toBe(false);
  });

  it("mendaftar tipe yang tersedia", () => {
    expect(KELOMPOK_TIPE).toEqual(["kelompok", "lembaga"]);
  });
});
