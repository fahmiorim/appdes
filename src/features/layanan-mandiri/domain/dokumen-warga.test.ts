import { describe, expect, it } from "vitest";

import {
  bisaDiubahWarga,
  dokumenWargaSchema,
  JENIS_DOKUMEN_WARGA,
  KODE_JENIS_DOKUMEN,
  labelJenisDokumen,
  labelSumberDokumen,
  sumberDokumen,
} from "./dokumen-warga";

describe("dokumen warga", () => {
  it("menerima semua jenis dokumen yang tercantum di katalog", () => {
    for (const kode of KODE_JENIS_DOKUMEN) {
      const hasil = dokumenWargaSchema.safeParse({ jenis: kode, nama: `Dokumen ${kode}` });
      expect(hasil.success).toBe(true);
    }
    expect(KODE_JENIS_DOKUMEN).toHaveLength(Object.keys(JENIS_DOKUMEN_WARGA).length);
  });

  it("menolak jenis di luar katalog dan nama kosong", () => {
    expect(dokumenWargaSchema.safeParse({ jenis: "sim", nama: "SIM" }).success).toBe(false);
    expect(dokumenWargaSchema.safeParse({ jenis: "ktp", nama: "   " }).success).toBe(false);
    expect(dokumenWargaSchema.safeParse({ jenis: "ktp", nama: "a".repeat(201) }).success).toBe(
      false,
    );
  });

  it("membuang spasi tepi pada nama", () => {
    const hasil = dokumenWargaSchema.parse({ jenis: "kk", nama: "  KK 2026  " });
    expect(hasil.nama).toBe("KK 2026");
  });

  it("memberi label jenis dan fallback kode asing", () => {
    expect(labelJenisDokumen("ktp")).toBe("KTP");
    expect(labelJenisDokumen("akta_kelahiran")).toBe("Akta Kelahiran");
    expect(labelJenisDokumen("tidak_ada")).toBe("tidak_ada");
  });

  it("hanya unggahan warga yang dapat diubah pemiliknya", () => {
    expect(bisaDiubahWarga({ sumber: "warga" })).toBe(true);
    expect(bisaDiubahWarga({ sumber: "operator" })).toBe(false);
    expect(sumberDokumen("operator")).toBe("operator");
    expect(sumberDokumen("lain")).toBe("warga");
    expect(labelSumberDokumen("operator")).toBe("Diunggah operator");
    expect(labelSumberDokumen("warga")).toBe("Unggahan saya");
  });
});
