import { describe, expect, it } from "vitest";

import {
  inventarisMutasiFormSchema,
  MUTASI_JENIS,
  MUTASI_JENIS_LABELS,
  MUTASI_STATUS,
  type InventarisMutasiInput,
  type MutasiJenis,
} from "./inventaris";

describe("inventarisMutasiFormSchema", () => {
  const validInput: InventarisMutasiInput = {
    inventarisId: 1,
    jenis: "pindah" as MutasiJenis,
    tanggalMutasi: "2024-01-15",
    lokasiBaru: "Gudang utama",
    kondisiBaru: "baik" as const,
    jumlahMutasi: 1,
    alasan: "Alasan mutasi barang",
    keterangan: "",
  };

  it("menerima input mutasi valid", () => {
    const result = inventarisMutasiFormSchema.parse(validInput);
    expect(result.inventarisId).toBe(1);
    expect(result.jenis).toBe("pindah");
    expect(result.tanggalMutasi).toBe("2024-01-15");
    expect(result.lokasiBaru).toBe("Gudang utama");
    expect(result.kondisiBaru).toBe("baik");
    expect(result.jumlahMutasi).toBe(1);
    expect(result.alasan).toBe("Alasan mutasi barang");
    expect(result.keterangan).toBe("");
  });

  it("menolak inventarisId nol atau negatif", () => {
    const zeroResult = inventarisMutasiFormSchema.safeParse({ ...validInput, inventarisId: 0 });
    expect(zeroResult.success).toBe(false);

    const negResult = inventarisMutasiFormSchema.safeParse({ ...validInput, inventarisId: -1 });
    expect(negResult.success).toBe(false);
  });

  it("menolak jenis mutasi yang tidak valid", () => {
    const invalidJenis = inventarisMutasiFormSchema.safeParse({
      ...validInput,
      jenis: "invalid" as MutasiJenis,
    });
    expect(invalidJenis.success).toBe(false);
  });

  it("menolak alasan yang kosong", () => {
    const emptyAlasan = inventarisMutasiFormSchema.safeParse({ ...validInput, alasan: "" });
    expect(emptyAlasan.success).toBe(false);
  });

  it("menolak alasan yang terlalu panjang (melebihi 500 karakter)", () => {
    const tooLong = "a".repeat(501);
    const longAlasan = inventarisMutasiFormSchema.safeParse({ ...validInput, alasan: tooLong });
    expect(longAlasan.success).toBe(false);
  });

  it("menerima lokasiBaru kosong", () => {
    const result = inventarisMutasiFormSchema.parse({ ...validInput, lokasiBaru: "" });
    expect(result.lokasiBaru).toBe("");
  });

  it("menerima kondisiBaru opsional", () => {
    const result = inventarisMutasiFormSchema.parse({ ...validInput, kondisiBaru: undefined });
    expect(result.kondisiBaru).toBeUndefined();
  });
});

describe("MutasiJenis dan MUTASI_JENIS_LABELS", () => {
  it("seharusnya MUTASI_JENIS berisi 4 jenis mutasi", () => {
    expect(MUTASI_JENIS).toHaveLength(4);
    expect(MUTASI_JENIS).toContain("pindah");
    expect(MUTASI_JENIS).toContain("rusak");
    expect(MUTASI_JENIS).toContain("hapus");
    expect(MUTASI_JENIS).toContain("perbaikan");
  });

  it("seharusnya MUTASI_JENIS_LABELS memiliki label untuk setiap jenis", () => {
    expect(MUTASI_JENIS_LABELS.pindah).toBe("Pindah Lokasi");
    expect(MUTASI_JENIS_LABELS.rusak).toBe("Rusak");
    expect(MUTASI_JENIS_LABELS.hapus).toBe("Hapus");
    expect(MUTASI_JENIS_LABELS.perbaikan).toBe("Perbaikan");
  });

  it("seharusnya semua key MUTASI_JENIS ada di MUTASI_JENIS_LABELS", () => {
    for (const jenis of MUTASI_JENIS) {
      expect(jenis in MUTASI_JENIS_LABELS).toBe(true);
    }
  });
});

describe("MutasiStatus dan MUTASI_STATUS", () => {
  it("seharusnya MUTASI_STATUS berisi 3 status", () => {
    expect(MUTASI_STATUS).toHaveLength(3);
    expect(MUTASI_STATUS).toContain("diajukan");
    expect(MUTASI_STATUS).toContain("disetujui");
    expect(MUTASI_STATUS).toContain("ditolak");
  });

  it("seharusnya MUTASI_STATUS memiliki nilai yang sesuai", () => {
    expect(MUTASI_STATUS[0]).toBe("diajukan");
    expect(MUTASI_STATUS[1]).toBe("disetujui");
    expect(MUTASI_STATUS[2]).toBe("ditolak");
  });

  it("seharusnya MUTASI_STATUS bertipe string", () => {
    expect(typeof MUTASI_STATUS[0]).toBe("string");
    expect(typeof MUTASI_STATUS[1]).toBe("string");
    expect(typeof MUTASI_STATUS[2]).toBe("string");
  });
});
