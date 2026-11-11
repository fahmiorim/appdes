import { describe, expect, it } from "vitest";

import {
  buildIsianValues,
  isianErrorsToFieldErrors,
  parseIsianFields,
  parseNilaiIsian,
  parseSyaratIds,
  serializeIsianFields,
  serializeNilaiIsian,
  serializeSyaratIds,
  validateIsianFields,
  validateIsianValues,
  type IsianField,
} from "./isian";

const fields: IsianField[] = [
  { kode: "nama_usaha", label: "Nama Usaha", tipe: "text", required: true, opsi: [] },
  {
    kode: "jenis_usaha",
    label: "Jenis Usaha",
    tipe: "select",
    required: true,
    opsi: ["Perdagangan", "Jasa"],
  },
  { kode: "modal", label: "Modal", tipe: "number", required: false, opsi: [] },
];

describe("parseIsianFields", () => {
  it("membaca daftar isian dari JSON", () => {
    const raw = JSON.stringify([
      { kode: "nama_usaha", label: "Nama Usaha", tipe: "text", required: true, opsi: [] },
    ]);

    expect(parseIsianFields(raw)).toHaveLength(1);
  });

  it("mengabaikan JSON rusak dan isian tidak valid", () => {
    expect(parseIsianFields("{bukan json")).toEqual([]);
    expect(parseIsianFields("[]")).toEqual([]);
    expect(parseIsianFields(JSON.stringify({ kode: "bukan-array" }))).toEqual([]);

    const raw = JSON.stringify([
      { kode: "KODE SALAH", label: "X", tipe: "text" },
      { kode: "nama_usaha", label: "Nama Usaha", tipe: "text" },
    ]);

    const parsed = parseIsianFields(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.kode).toBe("nama_usaha");
  });
});

describe("validateIsianFields", () => {
  it("menolak kode duplikat", () => {
    const error = validateIsianFields([
      { kode: "proyek", label: "A", tipe: "text", required: false, opsi: [] },
      { kode: "proyek", label: "B", tipe: "text", required: false, opsi: [] },
    ]);

    expect(error).toContain("duplikat");
  });

  it("menolak kode yang bentrok dengan placeholder bawaan", () => {
    const error = validateIsianFields([
      { kode: "nama_desa", label: "A", tipe: "text", required: false, opsi: [] },
    ]);

    expect(error).toContain("placeholder bawaan");
  });

  it("menolak pilihan kosong pada isian bertipe select", () => {
    const error = validateIsianFields([
      { kode: "pilihan", label: "A", tipe: "select", required: false, opsi: [] },
    ]);

    expect(error).toContain("minimal satu opsi");
  });

  it("menerima daftar isian yang valid", () => {
    expect(validateIsianFields(fields)).toBeNull();
  });
});

describe("buildIsianValues", () => {
  it("hanya mengambil kode yang dikenal dan tidak kosong", () => {
    const values = buildIsianValues(fields, {
      nama_usaha: "  Toko Makmur  ",
      modal: "   ",
      tidak_dikenal: "abc",
    });

    expect(values).toEqual({ nama_usaha: "Toko Makmur" });
  });

  it("mengubah centang menjadi Ya/Tidak", () => {
    const values = buildIsianValues(
      [{ kode: "sudah", label: "Sudah", tipe: "checkbox", required: false, opsi: [] }],
      { sudah: "true" },
    );

    expect(values.sudah).toBe("Ya");
  });
});

describe("validateIsianValues", () => {
  it("menandai isian wajib yang kosong", () => {
    const errors = validateIsianValues(fields, { nama_usaha: "Toko Makmur" });

    expect(errors).toEqual({ jenis_usaha: "Jenis Usaha wajib diisi." });
  });

  it("tidak menandai isian opsional yang kosong", () => {
    expect(validateIsianValues(fields, { nama_usaha: "Toko", jenis_usaha: "Jasa" })).toEqual({});
  });

  it("mengubah galat menjadi peta per-field berawalan `isian.`", () => {
    expect(isianErrorsToFieldErrors({ jenis_usaha: "wajib" })).toEqual({
      "isian.jenis_usaha": ["wajib"],
    });
  });
});

describe("penyimpanan daftar syarat", () => {
  it("membaca dan menulis id syarat sebagai JSON terurut", () => {
    expect(parseSyaratIds("[3,1,2,1]")).toEqual([1, 2, 3]);
    expect(serializeSyaratIds([3, 1, 2])).toBe("[1,2,3]");
  });

  it("mengabaikan id tidak valid", () => {
    expect(parseSyaratIds('["a",0,-1,null,2]')).toEqual([2]);
    expect(parseSyaratIds("bukan json")).toEqual([]);
  });
});

describe("penyimpanan nilai isian surat", () => {
  it("menyimpan dan membaca peta nilai", () => {
    const values = { nama_usaha: "Toko Makmur" };
    expect(parseNilaiIsian(serializeNilaiIsian(values))).toEqual(values);
  });

  it("mengabaikan payload yang bukan objek", () => {
    expect(parseNilaiIsian("[1,2]")).toEqual({});
    expect(parseNilaiIsian("bukan json")).toEqual({});
  });
});

describe("serializeIsianFields", () => {
  it("menyimpan daftar isian sebagai JSON", () => {
    const raw = serializeIsianFields(fields);
    expect(parseIsianFields(raw)).toHaveLength(3);
  });
});
