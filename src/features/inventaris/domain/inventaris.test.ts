import { describe, expect, it } from "vitest";

import {
  hitungPerubahanAset,
  mutasiLogBeforeStep,
  nextMutasiStep,
  roleCanApproveMutasiStep,
  type MutasiAssetSnapshot,
  type MutasiDetailSnapshot,
} from "./inventaris";

const mutasiDasar = {
  status: "diajukan" as const,
  verifikasiOleh: null,
  verifikasiSekdes: null,
  verifikasiKades: null,
};

const asetDasar: MutasiAssetSnapshot = {
  jumlah: "10.00",
  hargaSatuan: "1500.00",
  nilaiAkhir: "15000.00",
  kondisi: "baik",
  lokasi: "Gudang lama",
  isDeleted: false,
};

function mutasi(overrides: Partial<MutasiDetailSnapshot>): MutasiDetailSnapshot {
  return {
    jenis: "pindah",
    lokasiBaru: "Gudang baru",
    kondisiBaru: null,
    jumlahMutasi: "10.00",
    ...overrides,
  };
}

describe("verifikasi mutasi berjenjang", () => {
  it("menentukan tahap berikutnya secara berurutan", () => {
    expect(nextMutasiStep(mutasiDasar)).toBe("operator");
    expect(nextMutasiStep({ ...mutasiDasar, verifikasiOleh: "Operator A" })).toBe("sekdes");
    expect(
      nextMutasiStep({
        ...mutasiDasar,
        verifikasiOleh: "Operator A",
        verifikasiSekdes: "Sekdes B",
      }),
    ).toBe("kades");
    expect(
      nextMutasiStep({
        ...mutasiDasar,
        verifikasiOleh: "Operator A",
        verifikasiSekdes: "Sekdes B",
        verifikasiKades: "Kades C",
      }),
    ).toBeNull();
  });

  it("tidak memberi tahap untuk mutasi yang selesai atau ditolak", () => {
    expect(nextMutasiStep({ ...mutasiDasar, status: "disetujui" })).toBeNull();
    expect(nextMutasiStep({ ...mutasiDasar, status: "ditolak" })).toBeNull();
  });

  it("membatasi tahap berdasarkan role", () => {
    expect(roleCanApproveMutasiStep("operator", "operator", false)).toBe(true);
    expect(roleCanApproveMutasiStep("operator", "sekretaris-desa", false)).toBe(false);
    expect(roleCanApproveMutasiStep("sekdes", "sekretaris-desa", false)).toBe(true);
    expect(roleCanApproveMutasiStep("kades", "kepala-desa", false)).toBe(true);
    expect(roleCanApproveMutasiStep("kades", null, true)).toBe(true);
  });

  it("memetakan log sebelum tahap", () => {
    expect(mutasiLogBeforeStep("operator")).toBe("diajukan");
    expect(mutasiLogBeforeStep("sekdes")).toBe("operator");
    expect(mutasiLogBeforeStep("kades")).toBe("sekdes");
  });
});

describe("hitungPerubahanAset", () => {
  it("memindahkan lokasi hanya setelah seluruh aset dimutasi", () => {
    expect(hitungPerubahanAset(asetDasar, mutasi({ jenis: "pindah" }))).toEqual({
      lokasi: "Gudang baru",
    });
  });

  it("menolak mutasi pindah sebagian", () => {
    expect(() =>
      hitungPerubahanAset(asetDasar, mutasi({ jenis: "pindah", jumlahMutasi: "4.00" })),
    ).toThrow(/seluruh jumlah aset/);
  });

  it("mewajibkan lokasi baru untuk mutasi pindah", () => {
    expect(() =>
      hitungPerubahanAset(asetDasar, mutasi({ jenis: "pindah", lokasiBaru: " " })),
    ).toThrow(/Lokasi baru wajib diisi/);
  });

  it("mengubah kondisi untuk mutasi rusak", () => {
    expect(
      hitungPerubahanAset(asetDasar, mutasi({ jenis: "rusak", kondisiBaru: "rusak_berat" })),
    ).toEqual({ kondisi: "rusak_berat" });
  });

  it("menolak mutasi rusak tanpa kondisi rusak", () => {
    expect(() =>
      hitungPerubahanAset(asetDasar, mutasi({ jenis: "rusak", kondisiBaru: "baik" })),
    ).toThrow(/rusak ringan atau rusak berat/);
  });

  it("menerapkan kondisi setelah perbaikan", () => {
    expect(
      hitungPerubahanAset(asetDasar, mutasi({ jenis: "perbaikan", kondisiBaru: "baik" })),
    ).toEqual({ kondisi: "baik" });
  });

  it("mengurangi jumlah aset untuk penghapusan sebagian", () => {
    expect(
      hitungPerubahanAset(asetDasar, mutasi({ jenis: "hapus", jumlahMutasi: "4.00" })),
    ).toEqual({ jumlah: "6.00", nilaiAkhir: "9000.00" });
  });

  it("menonaktifkan barang saat seluruh jumlah dihapus", () => {
    const patch = hitungPerubahanAset(asetDasar, mutasi({ jenis: "hapus", jumlahMutasi: "10.00" }));

    expect(patch).toMatchObject({
      jumlah: "0.00",
      nilaiAkhir: "0.00",
      isDeleted: true,
    });
    expect(patch.deletedAt).toBeInstanceOf(Date);
  });

  it("menolak jumlah mutasi melebihi stok", () => {
    expect(() =>
      hitungPerubahanAset(asetDasar, mutasi({ jenis: "hapus", jumlahMutasi: "11.00" })),
    ).toThrow(/melebihi jumlah aset/);
  });

  it("menolak barang yang sudah dihapus", () => {
    expect(() =>
      hitungPerubahanAset({ ...asetDasar, isDeleted: true }, mutasi({ jenis: "hapus" })),
    ).toThrow(/sudah dihapus/);
  });
});
