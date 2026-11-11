import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";
import { isBlankSelection, optionalIsoDate, optionalText } from "@/lib/forms";

/** Slug resource RBAC untuk modul pembangunan (harus sama dengan `modules.slug`). */
export const PEMBANGUNAN_RESOURCE = RESOURCES.pembangunan;

// --- Status proyek ----------------------------------------------------------

export const STATUS_PEMBANGUNAN = ["rencana", "berjalan", "selesai", "dibatalkan"] as const;
export type StatusPembangunan = (typeof STATUS_PEMBANGUNAN)[number];

export const STATUS_PEMBANGUNAN_LABELS: Readonly<Record<StatusPembangunan, string>> = {
  rencana: "Rencana",
  berjalan: "Berjalan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export function statusPembangunanLabel(status: string | null): string {
  return status && status in STATUS_PEMBANGUNAN_LABELS
    ? STATUS_PEMBANGUNAN_LABELS[status as StatusPembangunan]
    : "-";
}

// --- Sumber dana ------------------------------------------------------------

/** Sumber dana proyek; disimpan sebagai teks agar fleksibel. */
export const SUMBER_DANA_PEMBANGUNAN = [
  "APBDes",
  "Dana Desa",
  "ADD",
  "Bantuan Pusat",
  "Bantuan Provinsi",
  "Bantuan Kabupaten",
  "Swadaya Masyarakat",
  "Lainnya",
] as const;

export type SumberDanaPembangunan = (typeof SUMBER_DANA_PEMBANGUNAN)[number];

export function sumberDanaLabel(value: string | null): string {
  return value && value.trim() !== "" ? value : "-";
}

// --- Validasi formulir -----------------------------------------------------

/** Slug dari judul; selalu diawali huruf. */
function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPembangunanSlug(judul: string): string {
  const slug = normalizeSlug(judul);
  return slug === "" ? "proyek" : slug;
}

/** Angka opsional (kosong → `null`). */
function optionalNumber(message: string) {
  return z.preprocess(
    (value) => (isBlankSelection(value) ? null : value),
    z.coerce.number({ error: message }).min(0, message).nullable(),
  );
}

/** Skema validasi input proyek pembangunan. */
export const pembangunanFormSchema = z.object({
  judul: z.string().trim().min(1, "Judul proyek wajib diisi.").max(200, "Maksimal 200 karakter."),
  deskripsi: optionalText(2000),
  lokasi: optionalText(200),
  tahunAnggaran: z.coerce
    .number({ error: "Tahun anggaran tidak valid." })
    .int("Tahun anggaran tidak valid.")
    .min(2000, "Tahun anggaran tidak valid.")
    .max(2100, "Tahun anggaran tidak valid."),
  sumberDana: z.preprocess(
    (value) => (isBlankSelection(value) ? null : value),
    z.string().trim().max(40, "Maksimal 40 karakter.").nullable(),
  ),
  anggaran: optionalNumber("Anggaran tidak valid."),
  volume: optionalNumber("Volume tidak valid."),
  satuan: optionalText(30),
  pelaksana: optionalText(200),
  mulai: optionalIsoDate,
  selesai: optionalIsoDate,
  status: z.preprocess(
    (value) => (isBlankSelection(value) ? "rencana" : value),
    z.enum(STATUS_PEMBANGUNAN, { error: "Status tidak valid." }),
  ),
  progres: z.coerce
    .number({ error: "Progres tidak valid." })
    .int("Progres tidak valid.")
    .min(0, "Progres 0–100.")
    .max(100, "Progres 0–100."),
  hasil: optionalText(2000),
});

export type PembangunanFormInput = z.infer<typeof pembangunanFormSchema>;

/** Skema metadata dokumentasi (berkas diunggah terpisah). */
export const dokumentasiFormSchema = z.object({
  judul: optionalText(150),
  keterangan: optionalText(500),
});

export type DokumentasiFormInput = z.infer<typeof dokumentasiFormSchema>;

// --- Bentuk data untuk UI --------------------------------------------------

export interface PembangunanProyekDTO {
  id: number;
  judul: string;
  slug: string;
  deskripsi: string | null;
  lokasi: string | null;
  tahunAnggaran: number;
  sumberDana: string | null;
  anggaran: string | null;
  volume: string | null;
  satuan: string | null;
  pelaksana: string | null;
  mulai: string | null;
  selesai: string | null;
  status: string;
  progres: number;
  hasil: string | null;
}

export interface PembangunanDokumentasiDTO {
  id: number;
  gambar: string;
  judul: string | null;
  keterangan: string | null;
  /** Waktu unggah, dipakai linimasa publik. */
  createdAt: Date | null;
}

export interface PembangunanDetail {
  proyek: PembangunanProyekDTO;
  dokumentasi: PembangunanDokumentasiDTO[];
  canManage: boolean;
}

/** Format rupiah ringkas; `null`/kosong menjadi "-". */
export function formatAnggaran(value: string | null): string {
  if (value === null || value.trim() === "") return "-";
  const angka = Number(value);
  if (!Number.isFinite(angka)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(angka);
}
