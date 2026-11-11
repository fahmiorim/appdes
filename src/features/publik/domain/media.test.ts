import { describe, expect, it } from "vitest";

import {
  isKategoriMediaPublik,
  JENIS_MEDIA,
  namaBerkasAman,
  validasiBerkasSyarat,
  validasiMedia,
} from "./media";

describe("validasiMedia", () => {
  it("menerima JPEG dan menandai ekstensi kanonik", () => {
    const hasil = validasiMedia("image/jpeg", 1024);
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.jenis.ekstensi).toBe("jpg");
  });

  it("menerima MIME tanpa peduli besar-kecil huruf", () => {
    expect(validasiMedia("IMAGE/PNG", 1024).ok).toBe(true);
  });

  it("menolak MIME di luar allowlist", () => {
    expect(validasiMedia("application/x-php", 10).ok).toBe(false);
    expect(validasiMedia("text/html", 10).ok).toBe(false);
  });

  it("menolak berkas kosong", () => {
    expect(validasiMedia("image/png", 0).ok).toBe(false);
  });

  it("menolak berkas melebihi batas ukuran", () => {
    const maks = JENIS_MEDIA["image/png"]?.maksByte ?? 0;
    expect(validasiMedia("image/png", maks + 1).ok).toBe(false);
  });

  it("menolak MIME kosong", () => {
    expect(validasiMedia(null, 10).ok).toBe(false);
    expect(validasiMedia(undefined, 10).ok).toBe(false);
  });
});

describe("kategori media publik", () => {
  it("mengizinkan kategori konten dan menolak berkas permohonan warga", () => {
    expect(isKategoriMediaPublik("berita")).toBe(true);
    expect(isKategoriMediaPublik("dokumen")).toBe(true);
    expect(isKategoriMediaPublik("permohonan")).toBe(false);
    expect(isKategoriMediaPublik("")).toBe(false);
  });
});

describe("validasiBerkasSyarat", () => {
  it("menerima JPG/PNG/WEBP/PDF dalam batas ukuran", () => {
    expect(validasiBerkasSyarat("image/jpeg", 1024).ok).toBe(true);
    expect(validasiBerkasSyarat("application/pdf", 1024).ok).toBe(true);
  });

  it("menolak SVG, GIF, dan tipe lain meski media publik mengizinkannya", () => {
    expect(validasiBerkasSyarat("image/svg+xml", 100).ok).toBe(false);
    expect(validasiBerkasSyarat("image/gif", 100).ok).toBe(false);
    expect(validasiBerkasSyarat("text/html", 100).ok).toBe(false);
  });

  it("menolak berkas kosong dan melebihi batas", () => {
    const maks = JENIS_MEDIA["image/png"]?.maksByte ?? 0;
    expect(validasiBerkasSyarat("image/png", 0).ok).toBe(false);
    expect(validasiBerkasSyarat("image/png", maks + 1).ok).toBe(false);
  });
});

describe("namaBerkasAman", () => {
  it("membuang ekstensi dan karakter tak aman", () => {
    expect(namaBerkasAman("Foto Kegiatan (2024)!!.PHP")).toBe("foto-kegiatan-2024");
  });

  it("melucuti diakritik", () => {
    expect(namaBerkasAman("Rapat Krém Warga.png")).toBe("rapat-krem-warga");
  });

  it("memakai 'berkas' bila tidak ada karakter sah", () => {
    expect(namaBerkasAman("!!!.jpg")).toBe("berkas");
  });
});
