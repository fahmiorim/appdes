/**
 * Domain kebijakan lampiran berkas — pengaturan terpusat per desa & kategori.
 *
 * Mengganti konstanta hardcoded (`MIME_LAMPIRAN_SURAT`, `MAKS_LAMPIRAN`,
 * `MAKS_UKURAN_LAMPIRAN`) dengan konfigurasi yang dapat diubah operator.
 * Nilai NULL di DB berarti kembali ke default domain (fallback).
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { mediaSettings } from "@/db/schema/media-settings";

const MB = 1024 * 1024;

/**
 * Kategori yang dikenali untuk pengaturan lampiran.
 *
 * Setiap kategori memiliki default yang berbeda.
 */
export const KATEGORI_LAMPIRAN = [
  "surat",
  "dokumen",
  "umum",
  "pengaduan",
  "permohonan",
  "berita",
  "galeri",
  "slider",
  "perangkat",
  "surat-tte",
] as const;

export type KategoriLampiran = (typeof KATEGORI_LAMPIRAN)[number];

/** Konfigurasi efektif (setelah fallback dari DB). */
export interface MediaSettingsEfektif {
  kategori: KategoriLampiran;
  /** Daftar MIME yang diizinkan. */
  mimeAllowlist: string[];
  /** Jumlah file maksimal sekaligus. */
  maxFiles: number;
  /** Ukuran per file maksimal dalam byte. */
  maxSizeBytes: number;
  /** Apakah berasal dari override DB (`true`) atau default domain (`false`). */
  overridden: boolean;
}

/** Input untuk update/pembuatan pengaturan. */
export interface MediaSettingsInput {
  kategori: KategoriLampiran;
  /** MIME allowed; kosong = pakai default. */
  mimeAllowlist: string[] | null;
  /** Max files; 0 atau null = pakai default. */
  maxFiles: number | null;
  /** Max size dalam MB; 0 atau null = pakai default. */
  maxSizeMb: number | null;
}

// ---------------------------------------------------------------------------
// Default per kategori (hardcoded fallback)
// ---------------------------------------------------------------------------

const defaultMimeSurat = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const defaultMimeUmum = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
];

const defaultMimeDokumen = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function defaultMimeUntuk(kategori: KategoriLampiran): string[] {
  switch (kategori) {
    case "surat":
      return defaultMimeSurat;
    case "surat-tte":
      return defaultMimeSurat;
    case "dokumen":
      return defaultMimeDokumen;
    case "permohonan":
      return defaultMimeSurat;
    case "pengaduan":
      return defaultMimeSurat;
    case "berita":
    case "galeri":
    case "slider":
    case "perangkat":
      return defaultMimeUmum;
    case "umum":
    default:
      return defaultMimeUmum;
  }
}

function defaultMaxSizeUntuk(kategori: KategoriLampiran): number {
  switch (kategori) {
    case "surat":
    case "surat-tte":
    case "permohonan":
    case "pengaduan":
      return 10 * MB;
    case "berita":
    case "galeri":
    case "slider":
      return 5 * MB;
    case "dokumen":
      return 20 * MB;
    default:
      return 10 * MB;
  }
}

function defaultMaxFilesUntuk(kategori: KategoriLampiran): number {
  // surat & ekspedisi: 5, galeri: 10, lainnya: 5
  switch (kategori) {
    case "galeri":
      return 10;
    default:
      return 5;
  }
}

/** Validasi MIME + ukuran menggunakan pengaturan efektif. */
export function validasiMediaDenganPengaturan(
  pengaturan: MediaSettingsEfektif,
  mime: string | null | undefined,
  ukuran: number,
): string | undefined {
  if (!mime) return "Tipe file tidak dikenali.";
  if (!pengaturan.mimeAllowlist.includes(mime)) {
    return `Tipe file tidak didukung. Format yang diizinkan: ${pengaturan.mimeAllowlist.join(
      ", ",
    )}.`;
  }
  if (ukuran > pengaturan.maxSizeBytes) {
    return `Ukuran file maksimal ${Math.round(pengaturan.maxSizeBytes / 1024 / 1024)} MB.`;
  }
  if (ukuran === 0) return "File kosong.";
  return undefined;
}

/**
 * Validasi jumlah file.
 */
export function validasiJumlahFile(
  pengaturan: MediaSettingsEfektif,
  jumlah: number,
): string | undefined {
  if (jumlah > pengaturan.maxFiles) {
    return `Maksimal ${pengaturan.maxFiles} file.`;
  }
  return undefined;
}
// Public API
// ---------------------------------------------------------------------------

/**
 * Ambil pengaturan efektif untuk satu desa & kategori.
 *
 * Nilai dari DB meng-override default domain. Kolom NULL = ambil dari default.
 */
export async function getMediaSettings(
  villageId: number,
  kategori: KategoriLampiran,
): Promise<MediaSettingsEfektif> {
  const [row] = await db
    .select()
    .from(mediaSettings)
    .where(and(eq(mediaSettings.villageId, villageId), eq(mediaSettings.kategori, kategori)));

  const overridden = !!row;
  const mimeAllowlist =
    row?.mimeAllowlist && Array.isArray(row.mimeAllowlist) && row.mimeAllowlist.length > 0
      ? (row.mimeAllowlist as string[])
      : defaultMimeUntuk(kategori);
  const maxFiles =
    row?.maxFiles && row.maxFiles > 0 ? row.maxFiles : defaultMaxFilesUntuk(kategori);
  const maxSizeBytes =
    row?.maxSizeBytes && row.maxSizeBytes > 0 ? row.maxSizeBytes : defaultMaxSizeUntuk(kategori);

  return {
    kategori,
    mimeAllowlist,
    maxFiles,
    maxSizeBytes,
    overridden,
  };
}

/**
 * Ambil seluruh pengaturan untuk satu desa (semua kategori).
 *
 * Kategori tanpa override tetap mengembalikan default domain.
 */
export async function getAllMediaSettings(villageId: number): Promise<MediaSettingsEfektif[]> {
  const rows = await db.select().from(mediaSettings).where(eq(mediaSettings.villageId, villageId));

  const map = new Map<string, (typeof rows)[number]>();
  for (const r of rows) map.set(r.kategori, r);

  return KATEGORI_LAMPIRAN.map((kat) => {
    const row = map.get(kat) ?? null;
    return getMediaSettingsFromRow(villageId, kat, row);
  });
}

function getMediaSettingsFromRow(
  _villageId: number,
  kategori: KategoriLampiran,
  row: typeof mediaSettings.$inferSelect | null,
): MediaSettingsEfektif {
  const overridden = !!row;
  const mimeAllowlist =
    row?.mimeAllowlist && Array.isArray(row.mimeAllowlist) && row.mimeAllowlist.length > 0
      ? (row.mimeAllowlist as string[])
      : defaultMimeUntuk(kategori);
  const maxFiles =
    row?.maxFiles && row.maxFiles > 0 ? row.maxFiles : defaultMaxFilesUntuk(kategori);
  const maxSizeBytes =
    row?.maxSizeBytes && row.maxSizeBytes > 0 ? row.maxSizeBytes : defaultMaxSizeUntuk(kategori);

  return { kategori, mimeAllowlist, maxFiles, maxSizeBytes, overridden };
}

/**
 * Simpan atau perbarui pengaturan untuk satu desa & kategori.
 */
export async function upsertMediaSettings(
  villageId: number,
  input: MediaSettingsInput,
): Promise<void> {
  // Validasi kategori
  if (!KATEGORI_LAMPIRAN.includes(input.kategori as KategoriLampiran)) {
    throw new Error("Kategori tidak dikenali.");
  }

  // Validasi MIME: setiap entry harus string dengan format yang valid
  if (input.mimeAllowlist) {
    for (const m of input.mimeAllowlist) {
      if (typeof m !== "string" || !m.includes("/")) {
        throw new Error(`MIME tidak valid: "${m}".`);
      }
    }
  }

  // Validasi maxFiles
  if (input.maxFiles !== null && (input.maxFiles < 0 || input.maxFiles > 100)) {
    throw new Error("Jumlah file maksimal harus antara 1-100.");
  }

  // Validasi maxSizeMb
  if (input.maxSizeMb !== null && (input.maxSizeMb < 0.1 || input.maxSizeMb > 500)) {
    throw new Error("Ukuran file maksimal harus antara 0.1-500 MB.");
  }

  const maxSizeBytes = input.maxSizeMb !== null ? Math.round(input.maxSizeMb * MB) : null;

  await db
    .insert(mediaSettings)
    .values({
      villageId,
      kategori: input.kategori,
      mimeAllowlist: input.mimeAllowlist,
      maxFiles: input.maxFiles,
      maxSizeBytes,
    })
    .onDuplicateKeyUpdate({
      set: {
        mimeAllowlist: input.mimeAllowlist,
        maxFiles: input.maxFiles,
        maxSizeBytes,
      },
    });
}

/**
 * Hapus pengaturan (kembali ke default domain).
 */
export async function resetMediaSettings(
  villageId: number,
  kategori: KategoriLampiran,
): Promise<void> {
  await db
    .delete(mediaSettings)
    .where(and(eq(mediaSettings.villageId, villageId), eq(mediaSettings.kategori, kategori)));
}
