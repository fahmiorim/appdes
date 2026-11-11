import { describe, expect, it } from "vitest";

import {
  MAKS_UKURAN_DOKUMEN_KERJASAMA,
  pelangganFormSchema,
  validasiDokumenKerjasama,
} from "./pelanggan";

describe("pelangganFormSchema", () => {
  it("mewajibkan nama dan memangkas spasi", () => {
    const parsed = pelangganFormSchema.parse({ nama: "  Koperasi Desa  " });
    expect(parsed.nama).toBe("Koperasi Desa");
  });

  it("menolak nama kosong", () => {
    expect(() => pelangganFormSchema.parse({ nama: "   " })).toThrow();
  });

  it("menolak nama lebih dari 200 karakter", () => {
    expect(() => pelangganFormSchema.parse({ nama: "a".repeat(201) })).toThrow();
  });

  it("memakai status 'menunggu' bila status tidak diisi", () => {
    const parsed = pelangganFormSchema.parse({ nama: "Toko Desa" });
    expect(parsed.statusLangganan).toBe("menunggu");
  });

  it("menerima empat status langganan dan menolak status lain", () => {
    for (const status of ["aktif", "nonaktif", "menunggu", "kadaluarsa"] as const) {
      expect(
        pelangganFormSchema.parse({ nama: "Toko Desa", statusLangganan: status }).statusLangganan,
      ).toBe(status);
    }
    expect(() =>
      pelangganFormSchema.parse({ nama: "Toko Desa", statusLangganan: "ditangguhkan" }),
    ).toThrow();
  });

  it("memangkas dan membatasi nomor kerja sama maksimal 100 karakter", () => {
    const parsed = pelangganFormSchema.parse({
      nama: "Toko Desa",
      noKerjasama: "  PJ/001/2026  ",
    });
    expect(parsed.noKerjasama).toBe("PJ/001/2026");
    expect(() =>
      pelangganFormSchema.parse({ nama: "Toko Desa", noKerjasama: "x".repeat(101) }),
    ).toThrow();
  });
});

describe("validasiDokumenKerjasama", () => {
  it("menerima dokumen PDF/JPG/PNG dalam batas ukuran", () => {
    for (const mime of ["application/pdf", "image/jpeg", "image/png", "IMAGE/PNG"]) {
      expect(validasiDokumenKerjasama(mime, 1024)).toEqual({ ok: true });
    }
  });

  it("menolak tipe dokumen lain, berkas kosong, dan berkas terlalu besar", () => {
    expect(validasiDokumenKerjasama("image/svg+xml", 1024)).toMatchObject({ ok: false });
    expect(validasiDokumenKerjasama(null, 1024)).toMatchObject({ ok: false });
    expect(validasiDokumenKerjasama("application/pdf", 0)).toMatchObject({ ok: false });
    expect(
      validasiDokumenKerjasama("application/pdf", MAKS_UKURAN_DOKUMEN_KERJASAMA + 1),
    ).toMatchObject({ ok: false, pesan: "Ukuran dokumen maksimal 5 MB." });
  });
});
