import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";
import {
  NO_SELECTION,
  optionalDigits,
  optionalIsoDate,
  optionalSelectId,
  optionalText,
  type LabelOption,
} from "@/lib/forms";

/** Slug resource RBAC untuk modul bantuan (harus sama dengan `modules.slug`). */
export const BANTUAN_RESOURCE = RESOURCES.programBantuan;
export const BANTUAN_PESERTA_RESOURCE = RESOURCES.pesertaBantuan;

/**
 * Bantuan Sosial.
 *
 * Terdiri dari dua domain yang saling terkait:
 * - **Program** (`bantuan_program`): definisi program beserta sasarannya.
 * - **Peserta** (`bantuan_peserta`): keanggotaan sasaran pada sebuah program.
 *
 * Status masa aktif program **dihitung** dari rentang tanggal, bukan disimpan,
 * agar tidak ada nilai yang bisa kedaluwarsa. Penautan peserta memakai FK
 * eksplisit per jenis sasaran (bukan kunci teks), sehingga integritas terjaga.
 */

// --- Sasaran -----------------------------------------------------------------

/** Sasaran program bantuan. Angka dipertahankan sama seperti katalog rujukan. */
export const SASARAN_BANTUAN = [1, 2, 3, 4] as const;
export type SasaranBantuan = (typeof SASARAN_BANTUAN)[number];

export const SASARAN_PENDUDUK: SasaranBantuan = 1;
export const SASARAN_KELUARGA: SasaranBantuan = 2;
export const SASARAN_RUMAH_TANGGA: SasaranBantuan = 3;
export const SASARAN_KELOMPOK: SasaranBantuan = 4;

export const SASARAN_LABELS: Readonly<Record<SasaranBantuan, string>> = {
  1: "Penduduk",
  2: "Keluarga (KK)",
  3: "Rumah Tangga (RTM)",
  4: "Kelompok",
};

/** Label sasaran, atau "-" bila belum ditentukan / tak dikenal. */
export function sasaranLabel(sasaran: number | null): string {
  if (sasaran === 1 || sasaran === 2 || sasaran === 3 || sasaran === 4) {
    return SASARAN_LABELS[sasaran];
  }
  return "-";
}

/**
 * Sasaran yang sudah dapat ditautkan pesertanya.
 *
 * Keempat jenis sasaran kini tersedia: penduduk, keluarga, rumah tangga, dan
 * kelompok (kelompok diisi lewat modul Kelompok & Lembaga).
 */
export const SASARAN_TERSEDIA: readonly SasaranBantuan[] = [
  SASARAN_PENDUDUK,
  SASARAN_KELUARGA,
  SASARAN_RUMAH_TANGGA,
  SASARAN_KELOMPOK,
];

/** Apakah sasaran sudah punya daftar kandidat peserta. */
export function isSasaranTersedia(sasaran: number): boolean {
  return SASARAN_TERSEDIA.includes(sasaran as SasaranBantuan);
}

// --- Asal dana ---------------------------------------------------------------

export const ASAL_DANA_BANTUAN = [1, 2, 3, 4, 5] as const;
export type AsalDanaBantuan = (typeof ASAL_DANA_BANTUAN)[number];

export const ASAL_DANA_LABELS: Readonly<Record<AsalDanaBantuan, string>> = {
  1: "Pusat",
  2: "Provinsi",
  3: "Kabupaten/Kota",
  4: "Desa",
  5: "Lainnya",
};

/** Label asal dana, atau "-" bila belum ditentukan / tak dikenal. */
export function asalDanaLabel(asalDana: number | null): string {
  if (asalDana === 1 || asalDana === 2 || asalDana === 3 || asalDana === 4 || asalDana === 5) {
    return ASAL_DANA_LABELS[asalDana];
  }
  return "-";
}

// --- Status masa aktif ------------------------------------------------------

/** Status masa aktif program (dihitung, bukan disimpan). */
export type StatusMasaAktif = "belum" | "aktif" | "selesai";

export const STATUS_MASA_AKTIF_LABELS: Readonly<Record<StatusMasaAktif, string>> = {
  belum: "Belum dimulai",
  aktif: "Aktif",
  selesai: "Selesai",
};

/** Tanggal ISO (`YYYY-MM-DD`) → angka hari; `null` bila kosong/tidak valid. */
function toDayNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 86_400_000);
}

/**
 * Hitung status masa aktif program dari rentang tanggalnya.
 *
 * - `belum` : `startDate` berada di masa depan.
 * - `selesai` : `endDate` sudah lewat.
 * - `aktif` : sisanya (termasuk saat rentang belum diisi sama sekali).
 *
 * Batas tanggal bersifat **inklusif**: program yang berakhir hari ini masih
 * dihitung aktif.
 */
export function statusMasaAktif(
  startDate: string | null,
  endDate: string | null,
  now: Date = new Date(),
): StatusMasaAktif {
  const today = Math.floor(now.getTime() / 86_400_000);
  const start = toDayNumber(startDate);
  const end = toDayNumber(endDate);

  if (start !== null && start > today) return "belum";
  if (end !== null && end < today) return "selesai";
  return "aktif";
}

// --- Validasi formulir -----------------------------------------------------

/** Nomor urut slug; dipakai agar slug selalu diawali huruf. */
function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Angka pilihan (sasaran/asal dana) → angka atau `null`. */
function optionalChoice(message: string) {
  return z.preprocess(
    (value) => (value === "" || value === NO_SELECTION || value === null ? null : value),
    z.coerce.number({ error: message }).int(message).nullable(),
  );
}

/** Skema validasi input program bantuan. */
export const bantuanFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama program wajib diisi.").max(100, "Maksimal 100 karakter."),
  sasaran: optionalChoice("Sasaran tidak valid.").refine(
    (value) => value === null || (value >= 1 && value <= 4),
    "Sasaran tidak valid.",
  ),
  keterangan: optionalText(500),
  tanggalMulai: optionalIsoDate,
  tanggalAkhir: optionalIsoDate,
  asalDana: optionalChoice("Asal dana tidak valid.").refine(
    (value) => value === null || (value >= 1 && value <= 5),
    "Asal dana tidak valid.",
  ),
});

export type BantuanFormInput = z.infer<typeof bantuanFormSchema>;

/**
 * Slug unik program.
 *
 * Bila nama tidak menghasilkan slug yang layak (mis. seluruhnya tanda baca),
 * dipakai awalan `program` agar slug tetap tidak kosong.
 */
export function buildProgramSlug(nama: string): string {
  const slug = normalizeSlug(nama);
  return slug === "" ? "program" : slug;
}

/** Skema validasi input peserta bantuan. */
export const pesertaFormSchema = z.object({
  programId: optionalSelectId,
  sasaranId: optionalSelectId,
  nomorKartu: optionalText(60),
  kartuNik: optionalDigits(16),
  kartuNama: optionalText(100),
  kartuTempatLahir: optionalText(100),
  kartuTanggalLahir: optionalIsoDate,
  kartuAlamat: optionalText(255),
});

export type PesertaFormInput = z.infer<typeof pesertaFormSchema>;

// --- Bentuk data untuk UI --------------------------------------------------

/** Bentuk data program yang dikirim ke UI (tanpa kolom internal). */
export interface BantuanDTO {
  id: number;
  name: string;
  slug: string;
  sasaran: number;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  asalDana: number | null;
}

/** Baris tabel program: DTO ditambah jumlah peserta & lokasi wilayah. */
export interface BantuanListRow extends BantuanDTO {
  pesertaCount: number;
  wilayahCount: number;
}

/** Satu peserta bantuan untuk tampilan rincian. */
export interface PesertaBantuanRow {
  id: number;
  /** Nama sasaran yang ditautkan (penduduk/keluarga/RTM). */
  targetName: string;
  /** Identitas sasaran (NIK / nomor KK / nomor RTM), bila ada. */
  targetIdentity: string | null;
  cardNumber: string | null;
  cardName: string | null;
  cardNationalId: string | null;
}

/** Pilihan sasaran yang belum menjadi peserta sebuah program. */
export interface SasaranOption {
  id: number;
  label: string;
}

/** Data referensi yang dibutuhkan formulir peserta. */
export interface PesertaReferenceData {
  penduduk: SasaranOption[];
  keluarga: SasaranOption[];
  rumahTangga: SasaranOption[];
  kelompok: SasaranOption[];
}

/** Wilayah yang menjadi domisili peserta, untuk ringkasan sebaran. */
export interface PesertaWilayahCount {
  label: string;
  total: number;
}

/** Data pendukung satu program: daftar peserta + data referensi + sebaran. */
export interface BantuanDetail {
  program: BantuanDTO;
  peserta: PesertaBantuanRow[];
  reference: PesertaReferenceData;
  sebaranWilayah: PesertaWilayahCount[];
  canManage: boolean;
}

/** Satu pilihan katalog: `id` numerik + `name` untuk ditampilkan. */
export interface BantuanReferenceOption extends LabelOption {
  /** Kode/nomor pendek pendukung (mis. "320101200100001"). */
  detail: string | null;
}
