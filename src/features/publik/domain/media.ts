/**
 * Validasi unggahan media (murni, tanpa I/O).
 *
 * Aturan aman:
 * - Hanya tipe MIME dalam allowlist (gambar & PDF).
 * - Ukuran dibatasi per kategori.
 * - Ekstensi diturunkan dari MIME, **bukan** dari nama berkas kiriman,
 *   sehingga berkas `gambar.php` yang menyamar sebagai JPEG tetap tersimpan
 *   sebagai `.jpg` dan tidak pernah dieksekusi.
 */

export interface JenisMedia {
  mime: string;
  ekstensi: string;
  maksByte: number;
}

const MB = 1024 * 1024;

/** Allowlist MIME → ekstensi kanonik & batas ukuran. */
export const JENIS_MEDIA: Record<string, JenisMedia> = {
  "image/jpeg": { mime: "image/jpeg", ekstensi: "jpg", maksByte: 5 * MB },
  "image/png": { mime: "image/png", ekstensi: "png", maksByte: 5 * MB },
  "image/webp": { mime: "image/webp", ekstensi: "webp", maksByte: 5 * MB },
  "image/gif": { mime: "image/gif", ekstensi: "gif", maksByte: 5 * MB },
  "image/svg+xml": { mime: "image/svg+xml", ekstensi: "svg", maksByte: 1 * MB },
  "application/pdf": { mime: "application/pdf", ekstensi: "pdf", maksByte: 20 * MB },
};

export type HasilValidasiMedia = { ok: true; jenis: JenisMedia } | { ok: false; pesan: string };

/** CSP untuk dokumen media aktif (SVG) yang disajikan inline. */
export const CSP_MEDIA_SANDBOX = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

/** Kategori media yang boleh disajikan lewat route publik. */
export const KATEGORI_MEDIA_PUBLIK = [
  "berita",
  "galeri",
  "slider",
  "perangkat",
  "dokumen",
  "umum",
] as const;

export function isKategoriMediaPublik(kategori: string): boolean {
  return (KATEGORI_MEDIA_PUBLIK as readonly string[]).includes(kategori);
}

/** MIME yang diizinkan untuk berkas syarat permohonan warga. */
export const MIME_SYARAT_PERMOHONAN = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/**
 * Validasi berkas syarat permohonan.
 *
 * Sengaja lebih ketat dari media publik: SVG dan GIF tidak diterima karena
 * berkas syarat disajikan inline pada origin aplikasi.
 */
export function validasiBerkasSyarat(
  mime: string | null | undefined,
  ukuranByte: number,
): HasilValidasiMedia {
  if (!mime) return { ok: false, pesan: "Tipe berkas tidak dikenali." };
  const normalized = mime.toLowerCase();
  if (!(MIME_SYARAT_PERMOHONAN as readonly string[]).includes(normalized)) {
    return { ok: false, pesan: "Gunakan berkas JPG, PNG, WEBP, atau PDF." };
  }
  return validasiMedia(normalized, ukuranByte);
}

/** Berkas unggahan yang sudah dibaca dari `FormData` (isi, bukan jalur). */
export interface BerkasUnggahan {
  nama: string;
  mime: string | null;
  ukuran: number;
  isi: Uint8Array;
}

/** Validasi MIME + ukuran unggahan. Mengembalikan jenis kanonik bila sah. */
export function validasiMedia(
  mime: string | null | undefined,
  ukuranByte: number,
): HasilValidasiMedia {
  if (!mime) return { ok: false, pesan: "Tipe berkas tidak dikenali." };

  const jenis = JENIS_MEDIA[mime.toLowerCase()];
  if (!jenis) {
    return { ok: false, pesan: `Tipe berkas ${mime} tidak diizinkan.` };
  }

  if (ukuranByte <= 0) return { ok: false, pesan: "Berkas kosong." };
  if (ukuranByte > jenis.maksByte) {
    const maksMb = Math.round(jenis.maksByte / MB);
    return { ok: false, pesan: `Ukuran berkas melebihi ${maksMb} MB.` };
  }

  return { ok: true, jenis };
}
/**
 * Deteksi tipe berkas dari magic bytes (isi), bukan dari MIME kiriman klien.
 *
 * Hanya jenis dalam allowlist media yang dikenali. `null` berarti isi berkas
 * tidak cocok dengan format media mana pun.
 */
export function deteksiTipeIsi(isi: Uint8Array): string | null {
  if (mulaiDengan(isi, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (mulaiDengan(isi, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (cocokAscii(isi, "GIF87a") || cocokAscii(isi, "GIF89a")) return "image/gif";
  if (cocokAscii(isi, "RIFF") && cocokAscii(isi, "WEBP", 8)) return "image/webp";
  if (cariAscii(isi, "%PDF-", 1024) >= 0) return "application/pdf";
  if (terlihatSvg(isi)) return "image/svg+xml";
  return null;
}

/**
 * Pastikan isi berkas benar-benar sesuai dengan MIME yang diklaim.
 *
 * MIME dari browser/`FormData` tidak dapat dipercaya: berkas teks yang diberi
 * label `image/png` akan tersimpan dengan ekstensi `.png` dan disajikan dengan
 * `Content-Type` gambar. Pemeriksaan magic bytes menutup celah itu.
 */
export function validasiIsiMedia(
  mime: string | null | undefined,
  isi: Uint8Array,
): { ok: true } | { ok: false; pesan: string } {
  if (!mime) return { ok: false, pesan: "Tipe berkas tidak dikenali." };
  if (isi.length === 0) return { ok: false, pesan: "Berkas kosong." };

  const terdeteksi = deteksiTipeIsi(isi);
  if (!terdeteksi) {
    return { ok: false, pesan: "Isi berkas tidak dikenali sebagai gambar atau PDF." };
  }

  if (terdeteksi !== mime.toLowerCase()) {
    return {
      ok: false,
      pesan: `Isi berkas tidak sesuai dengan tipe ${mime} yang dikirim.`,
    };
  }

  return { ok: true };
}

function mulaiDengan(isi: Uint8Array, awalan: number[]): boolean {
  if (isi.length < awalan.length) return false;
  return awalan.every((byte, indeks) => isi[indeks] === byte);
}

function cocokAscii(isi: Uint8Array, teks: string, offset = 0): boolean {
  if (isi.length < offset + teks.length) return false;
  for (let i = 0; i < teks.length; i += 1) {
    if (isi[offset + i] !== teks.charCodeAt(i)) return false;
  }
  return true;
}

function cariAscii(isi: Uint8Array, teks: string, batas: number): number {
  const akhir = Math.min(isi.length - teks.length, batas);
  for (let i = 0; i <= akhir; i += 1) {
    if (cocokAscii(isi, teks, i)) return i;
  }
  return -1;
}

/** SVG berbasis teks: kenali deklarasi XML atau elemen `<svg` di awal isi. */
function terlihatSvg(isi: Uint8Array): boolean {
  const cuplikan = new TextDecoder("utf-8", { fatal: false })
    .decode(isi.subarray(0, 4096))
    .replace(/^\uFEFF/, "")
    .trimStart();

  if (cuplikan.startsWith("<svg")) return true;
  return cuplikan.startsWith("<?xml") && cuplikan.includes("<svg");
}

/**
 * Bersihkan nama berkas kiriman menjadi basis slug yang aman.
 *
 * Hasil hanya memuat `[a-z0-9-]`; ekstensi tidak disertakan (ditentukan oleh
 * MIME). Bila tidak ada karakter sah, dipakai `berkas`.
 */
export function namaBerkasAman(namaAsli: string): string {
  const tanpaEkstensi = namaAsli.replace(/\.[^.]+$/, "");
  const bersih = tanpaEkstensi
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return bersih || "berkas";
}
