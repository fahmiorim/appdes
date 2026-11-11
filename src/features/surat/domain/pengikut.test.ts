import { describe, expect, it } from "vitest";

import {
  buildPengikutPlaceholders,
  kumpulkanPendudukLuar,
  parsePendudukLuar,
  parsePengikutIds,
  serializePendudukLuar,
  serializePengikutIds,
  type PendudukLuarSurat,
} from "./pengikut";
import type { AnggotaKeluargaSurat } from "./surat";

function anggota(partial: Partial<AnggotaKeluargaSurat>): AnggotaKeluargaSurat {
  return {
    nik: "3201012001120001",
    nama: "Siti",
    jenisKelamin: "Perempuan",
    tempatLahir: "Bandung",
    tanggalLahir: "1 Desember 2001",
    usia: "24",
    agama: "Islam",
    pendidikan: "SLTA/Sederajat",
    pendidikanSedang: "S1",
    pekerjaan: "Karyawan",
    statusKawin: "Kawin",
    hubunganKk: "Anak",
    kewarganegaraan: "WNI",
    golonganDarah: "O",
    alamat: "Jl. Contoh",
    namaAyah: "Budi",
    namaIbu: "Ani",
    nikAyah: null,
    nikIbu: null,
    ...partial,
  };
}

describe("id pengikut", () => {
  it("roundtrip CSV id", () => {
    expect(serializePengikutIds([5, 5, 2, 0, -1])).toBe("5,2");
    expect(parsePengikutIds("5,2")).toEqual([5, 2]);
    expect(parsePengikutIds("")).toEqual([]);
    expect(parsePengikutIds(null)).toEqual([]);
  });
});

describe("penduduk luar", () => {
  it("roundtrip JSON baris", () => {
    const baris: PendudukLuarSurat[] = [
      {
        nama: "Rudi",
        nik: "3201012000010101",
        jenisKelamin: "Laki-Laki",
        tempatLahir: "Bogor",
        tanggalLahir: "1 Januari 2000",
        pekerjaan: "Petani",
        alamat: "Jl. Luar No. 2",
        keterangan: "Mertua",
      },
    ];

    const serial = serializePendudukLuar(baris);
    expect(parsePendudukLuar(serial)).toEqual(baris);
    expect(parsePendudukLuar("bukan json")).toEqual([]);
    expect(parsePendudukLuar(null)).toEqual([]);
  });

  it("mengabaikan baris tanpa nama saat dikumpulkan dari formulir", () => {
    const formData = new FormData();
    formData.set("luar_jumlah", "2");
    formData.set("luar_nama_1", "Rudi");
    formData.set("luar_nik_1", "3201012000010101");

    const hasil = kumpulkanPendudukLuar(formData);
    expect(hasil).toHaveLength(1);
    expect(hasil[0]).toMatchObject({ nama: "Rudi", nik: "3201012000010101" });
  });
});

describe("buildPengikutPlaceholders", () => {
  it("mengisi baris pengikut & rekapnya", () => {
    const values = buildPengikutPlaceholders([anggota({})], []);

    expect(values.pengikut1_nama).toBe("Siti");
    expect(values.pengikut1_nik).toBe("3201012001120001");
    expect(values.pengikut1_ttl).toBe("Bandung, 1 Desember 2001");
    expect(values.pengikut1_usia).toBe("24");
    expect(values.pengikut1_jenis_kelamin).toBe("Perempuan");
    expect(values.pengikut_jumlah).toBe("1");
    expect(values.pengikut_daftar).toBe("Siti (3201012001120001)");
    expect(values.luar1_nama).toBeUndefined();
  });

  it("mengisi baris penduduk luar (bagian kosong jadi '-')", () => {
    const values = buildPengikutPlaceholders(
      [],
      [
        {
          nama: "Rudi",
          nik: "3201012000010101",
          jenisKelamin: "Laki-Laki",
          tempatLahir: "Bogor",
          tanggalLahir: "1 Januari 2000",
          pekerjaan: "Petani",
          alamat: "Jl. Luar No. 2",
          keterangan: "Mertua",
        },
      ],
    );

    expect(values.luar1_nama).toBe("Rudi");
    expect(values.luar1_nik).toBe("3201012000010101");
    expect(values.luar1_ttl).toBe("Bogor, 1 Januari 2000");
    expect(values.luar1_usia).toBe("-");
    expect(values.luar1_pekerjaan).toBe("Petani");
    expect(values.luar1_keterangan).toBe("Mertua");
    expect(values.luar_jumlah).toBe("1");
    expect(values.luar_daftar).toBe("Rudi");
    expect(values.pengikut_jumlah).toBe("0");
  });

  it("menangani nama tanpa NIK pada daftar rekap", () => {
    const values = buildPengikutPlaceholders([anggota({ nik: null })], []);
    expect(values.pengikut_daftar).toBe("Siti");
  });
});
