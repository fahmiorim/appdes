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
 * Validasi MIME + ukuran unggahan menggunakan pengaturan dinamis.
 */
export function validasiMediaDenganPengaturan(
  mime: string | null | undefined,
  ukuranByte: number,
  mimeAllowlist: string[],
  maxSizeBytes: number,
): HasilValidasiMedia {
  if (!mime) return { ok: false, pesan: "Tipe berkas tidak dikenali." };

  if (!mimeAllowlist.includes(mime.toLowerCase())) {
    return { ok: false, pesan: `Tipe berkas ${mime} tidak diizinkan.` };
  }

  if (ukuranByte <= 0) return { ok: false, pesan: "Berkas kosong." };
  if (ukuranByte > maxSizeBytes) {
    const maksMb = Math.round(maxSizeBytes / MB);
    return { ok: false, pesan: `Ukuran berkas melebihi ${maksMb} MB.` };
  }

  // Ekstensi default dari JENIS_MEDIA jika ada, fallback ke ekstensi umum
  const jenis = JENIS_MEDIA[mime.toLowerCase()];
  return { ok: true, jenis: jenis ?? { mime, ekstensi: "bin", maksByte: maxSizeBytes } };
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
