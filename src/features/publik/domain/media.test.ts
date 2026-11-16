import { describe, expect, it } from "vitest";

import {
  deteksiTipeIsi,
  isKategoriMediaPublik,
  JENIS_MEDIA,
  namaBerkasAman,
  validasiBerkasSyarat,
  validasiIsiMedia,
  validasiMedia,
} from "./media";

const jpeg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const pdf = () => new TextEncoder().encode("%PDF-1.7\n1 0 obj\n");
const webp = () =>
  new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const gif = () => new TextEncoder().encode("GIF89a\x01\x00");
const svg = () =>
  new TextEncoder().encode('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>');

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

describe("deteksiTipeIsi", () => {
  it("mengenali signature JPEG, PNG, GIF, WEBP, PDF, dan SVG", () => {
    expect(deteksiTipeIsi(jpeg())).toBe("image/jpeg");
    expect(deteksiTipeIsi(png())).toBe("image/png");
    expect(deteksiTipeIsi(gif())).toBe("image/gif");
    expect(deteksiTipeIsi(webp())).toBe("image/webp");
    expect(deteksiTipeIsi(pdf())).toBe("application/pdf");
    expect(deteksiTipeIsi(svg())).toBe("image/svg+xml");
  });

  it("mengembalikan null untuk isi yang tidak dikenali", () => {
    expect(deteksiTipeIsi(new Uint8Array())).toBeNull();
    expect(deteksiTipeIsi(new TextEncoder().encode("<?php echo 1; ?>"))).toBeNull();
    expect(deteksiTipeIsi(new TextEncoder().encode("<html></html>"))).toBeNull();
  });
});

describe("validasiIsiMedia", () => {
  it("menerima isi yang cocok dengan MIME yang diklaim", () => {
    expect(validasiIsiMedia("image/png", png()).ok).toBe(true);
    expect(validasiIsiMedia("IMAGE/JPEG", jpeg()).ok).toBe(true);
    expect(validasiIsiMedia("application/pdf", pdf()).ok).toBe(true);
  });

  it("menolak berkas yang menyamar sebagai tipe lain", () => {
    const hasil = validasiIsiMedia("image/png", new TextEncoder().encode("<?php echo 1; ?>"));
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.pesan).toContain("tidak dikenali");

    const tertukar = validasiIsiMedia("image/png", jpeg());
    expect(tertukar.ok).toBe(false);
    if (!tertukar.ok) expect(tertukar.pesan).toContain("tidak sesuai");
  });

  it("menolak isi kosong dan MIME tanpa nilai", () => {
    expect(validasiIsiMedia("image/png", new Uint8Array()).ok).toBe(false);
    expect(validasiIsiMedia(null, png()).ok).toBe(false);
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
