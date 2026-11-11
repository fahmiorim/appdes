import { z } from "zod";

import { buatSlug, PANJANG_SLUG_MAKS } from "@/features/publik/domain/slug";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { optionalIsoDate, optionalSelectId, optionalText } from "@/lib/forms";

/**
 * Konten berita & kategori.
 *
 * Domain ini murni (tanpa I/O) dan dipakai bersama oleh lapisan application,
 * Server Action, dan komponen form. Aturan penting:
 * - `isi` menyimpan HTML; sanitasi dilakukan application layer sebelum simpan.
 * - Slug tidak diisi pengguna: dibentuk dari judul dan diunikan per desa.
 * - Status hanya `draft` (belum tampil) atau `published` (tampil setelah
 *   `terbitPada` lewat; `null` berarti langsung tampil).
 */

export const BERITA_RESOURCE = RESOURCES.berita;
export const BERITA_KATEGORI_RESOURCE = RESOURCES.beritaKategori;

export const STATUS_BERITA = ["draft", "published"] as const;
export type StatusBerita = (typeof STATUS_BERITA)[number];

export const STATUS_BERITA_LABELS: Readonly<Record<StatusBerita, string>> = {
  draft: "Draf",
  published: "Terbit",
};

/** Skema form berita (draft/publish, jadwal, headline, slider, komentar). */
export const beritaFormSchema = z.object({
  judul: z.string().trim().min(1, "Judul wajib diisi.").max(200, "Maksimal 200 karakter."),
  kategoriId: optionalSelectId,
  ringkasan: optionalText(500),
  isi: z
    .string()
    .trim()
    .min(1, "Isi berita wajib diisi.")
    .max(200_000, "Isi berita terlalu panjang."),
  status: z.enum(STATUS_BERITA, { error: "Status berita tidak valid." }).default("draft"),
  terbitPada: optionalIsoDate,
  headline: z.boolean().default(false),
  slider: z.boolean().default(false),
  bolehKomentar: z.boolean().default(true),
});

export type BeritaFormInput = z.infer<typeof beritaFormSchema>;

/** Skema form kategori berita. */
export const kategoriBeritaFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama kategori wajib diisi.").max(100, "Maksimal 100 karakter."),
  urut: z.coerce
    .number({ error: "Urutan harus angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .max(999, "Urutan maksimal 999.")
    .default(0),
  aktif: z.boolean().default(true),
});

export type KategoriBeritaFormInput = z.infer<typeof kategoriBeritaFormSchema>;

/**
 * Slug dasar berita dari judul.
 *
 * Bila judul tidak menyisakan karakter sah (mis. hanya tanda baca), dipakai
 * awalan `berita` agar slug tidak pernah kosong.
 */
export function slugBerita(judul: string): string {
  const dasar = buatSlug(judul);
  return dasar === "" ? "berita" : dasar.slice(0, PANJANG_SLUG_MAKS);
}

/**
 * Slug dasar kategori dari nama.
 *
 * Kolom `berita_kategori.slug` hanya 100 karakter, sedangkan penanganan slug
 * unik menambahkan akhiran `-2` … `-200` (maksimal 4 karakter). Sisakan ruang
 * tersebut agar kandidat unik tidak pernah melewati batas kolom.
 */
export function slugKategoriBerita(nama: string): string {
  const dasar = buatSlug(nama, 96);
  return dasar === "" ? "kategori" : dasar;
}

/**
 * Tanggal terbit efektif.
 *
 * Berita `published` tanpa jadwal dianggap terbit sekarang agar langsung
 * tampil dan punya urutan kronologis. Berita `draft` tidak pernah dianggap
 * terbit, tetapi jadwal yang sudah diisi tetap disimpan.
 *
 * Milidetik dibuang karena kolom `berita.terbit_pada` bertipe `timestamp` tanpa
 * presisi pecahan: MySQL membulatkan `.500` ke atas, sehingga berita yang baru
 * disimpan bisa tercatat satu detik di masa depan dan sempat hilang dari daftar
 * publik (`terbit_pada <= sekarang`) sampai detik itu tiba.
 */
export function tanggalTerbitEfektif(
  status: StatusBerita,
  terbitPada: string | null,
  sekarang: Date = new Date(),
): Date | null {
  if (terbitPada) return new Date(`${terbitPada}T00:00:00`);
  if (status !== "published") return null;
  return new Date(Math.floor(sekarang.getTime() / 1000) * 1000);
}

/** Status yang bisa dipilih operator. */
export function labelStatusBerita(status: string): string {
  return status === "published" ? STATUS_BERITA_LABELS.published : STATUS_BERITA_LABELS.draft;
}

/** Baris daftar berita di admin (tanpa kolom isi yang besar). */
export interface BeritaAdminRow {
  id: number;
  judul: string;
  slug: string;
  kategori: string | null;
  status: string;
  terbitPada: Date | null;
  headline: boolean;
  updatedAt: Date;
}

/** Data lengkap berita untuk form ubah. */
export interface BeritaAdminDetail {
  id: number;
  judul: string;
  slug: string;
  kategoriId: number | null;
  ringkasan: string | null;
  isi: string;
  gambar: string | null;
  dokumen: string | null;
  status: string;
  terbitPada: string | null;
  headline: boolean;
  slider: boolean;
  bolehKomentar: boolean;
}

/** Pilihan kategori untuk form berita. */
export interface KategoriBeritaOption {
  id: number;
  nama: string;
}

/** Baris kategori pada halaman pengelolaan. */
export interface KategoriBeritaRow {
  id: number;
  nama: string;
  slug: string;
  urut: number;
  aktif: boolean;
}

/** Hasil paginasi daftar berita admin. */
export interface BeritaAdminListResult {
  rows: BeritaAdminRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
