import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";
import { optionalSelectId, optionalText, type LabelOption } from "@/lib/forms";

/** Slug resource RBAC untuk modul kelompok (harus sama dengan `modules.slug`). */
export const KELOMPOK_RESOURCE = RESOURCES.kelompok;
export const KATEGORI_KELOMPOK_RESOURCE = RESOURCES.kategoriKelompok;

/**
 * Kelompok Masyarakat & Lembaga Desa.
 *
 * Keduanya memakai **single-table inheritance**: lembaga adalah kelompok
 * bertipe `lembaga`, bukan tabel terpisah. Kategori (master) bersifat opsional
 * dan boleh dipakai bersama kedua tipe.
 *
 * Ketua kelompok **diturunkan** dari anggota berjabatan KETUA, sehingga tidak
 * ada kolom `ketua_id` yang bisa tidak sinkron dengan keanggotaan.
 */

// --- Tipe kelompok -----------------------------------------------------------

export const KELOMPOK_TIPE = ["kelompok", "lembaga"] as const;
export type KelompokTipe = (typeof KELOMPOK_TIPE)[number];

export const KELOMPOK_TIPE_LABELS: Readonly<Record<KelompokTipe, string>> = {
  kelompok: "Kelompok Masyarakat",
  lembaga: "Lembaga Desa",
};

export const KELOMPOK_TIPE_SHORT_LABELS: Readonly<Record<KelompokTipe, string>> = {
  kelompok: "Kelompok",
  lembaga: "Lembaga",
};

/** Label tipe, atau "-" bila tak dikenal. */
export function kelompokTipeLabel(tipe: string | null): string {
  if (tipe === "kelompok" || tipe === "lembaga") return KELOMPOK_TIPE_LABELS[tipe];
  return "-";
}

/** Apakah tipe termasuk salah satu nilai yang dikenal. */
export function isKelompokTipe(value: string): value is KelompokTipe {
  return value === "kelompok" || value === "lembaga";
}

// --- Jabatan -----------------------------------------------------------------

/**
 * Jabatan dalam kelompok.
 *
 * Angka dipertahankan sama seperti katalog rujukan (`JabatanKelompokEnum`),
 * termasuk loncatan ke `90` untuk anggota biasa.
 */
export const JABATAN_KELOMPOK = [1, 2, 3, 4, 90] as const;
export type JabatanKelompok = (typeof JABATAN_KELOMPOK)[number];

export const JABATAN_KETUA: JabatanKelompok = 1;

export const JABATAN_LABELS: Readonly<Record<JabatanKelompok, string>> = {
  1: "Ketua",
  2: "Wakil Ketua",
  3: "Sekretaris",
  4: "Bendahara",
  90: "Anggota",
};

/** Label jabatan, atau "-" bila tak dikenal. */
export function jabatanLabel(jabatan: number | null): string {
  if (jabatan === 1 || jabatan === 2 || jabatan === 3 || jabatan === 4 || jabatan === 90) {
    return JABATAN_LABELS[jabatan];
  }
  return "-";
}

/** Apakah jabatan termasuk ketua kelompok. */
export function isKetuaKelompok(jabatan: number | null): boolean {
  return jabatan === JABATAN_KETUA;
}

// --- Validasi formulir ------------------------------------------------------

/** Angka pilihan (tipe/kategori) dari select → nilai atau `null`. */
function optionalChoice(message: string) {
  return z.preprocess(
    (value) => (value === "" || value === "none" || value === null ? null : value),
    z.coerce.number({ error: message }).int(message).nullable(),
  );
}

/** Skema validasi input kelompok/lembaga. */
export const kelompokFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(150, "Maksimal 150 karakter."),
  tipe: z.enum(KELOMPOK_TIPE, { error: "Tipe tidak valid." }),
  kategoriId: optionalSelectId,
  kode: optionalText(50),
  nomorSk: optionalText(100),
  keterangan: optionalText(500),
});

export type KelompokFormInput = z.infer<typeof kelompokFormSchema>;

/** Skema validasi input kategori kelompok. */
export const kategoriKelompokFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama kategori wajib diisi.").max(100, "Maksimal 100 karakter."),
  tipe: z.enum(KELOMPOK_TIPE, { error: "Tipe tidak valid." }),
});

export type KategoriKelompokFormInput = z.infer<typeof kategoriKelompokFormSchema>;

/** Skema validasi input anggota kelompok. */
export const anggotaKelompokFormSchema = z.object({
  residentId: optionalSelectId,
  jabatan: optionalChoice("Jabatan tidak valid."),
  nomorAnggota: optionalText(50),
  nomorSk: optionalText(100),
});

export type AnggotaKelompokFormInput = z.infer<typeof anggotaKelompokFormSchema>;

// --- Slug --------------------------------------------------------------------

/** Bersihkan nama menjadi slug. */
function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug kelompok; memakai awalan `kelompok` bila nama tak menghasilkan slug. */
export function buildKelompokSlug(nama: string): string {
  const slug = normalizeSlug(nama);
  return slug === "" ? "kelompok" : slug;
}

// --- Bentuk data untuk UI --------------------------------------------------

/** Bentuk data kelompok yang dikirim ke UI (tanpa kolom internal). */
export interface KelompokDTO {
  id: number;
  name: string;
  slug: string;
  type: string;
  categoryId: number | null;
  code: string | null;
  decreeNumber: string | null;
  description: string | null;
}

/** Baris tabel kelompok: DTO ditambah data turunan hasil join/agregasi. */
export interface KelompokListRow extends KelompokDTO {
  categoryName: string | null;
  leaderName: string | null;
  memberCount: number;
}

/** Satu anggota kelompok untuk tampilan rincian. */
export interface KelompokMember {
  id: number;
  residentId: number;
  name: string;
  nationalId: string | null;
  position: number;
  memberNumber: string | null;
  decreeNumber: string | null;
  /** Apakah keanggotaan ini tampil di situs publik. */
  tampilPublik: boolean;
}

/** Anggota yang dipublikasikan di situs desa (tanpa NIK). */
export interface KelompokAnggotaPublik {
  id: number;
  name: string;
  position: number;
  memberNumber: string | null;
}

export interface RingkasanAnggotaPublik {
  jumlah: number;
  ketua: string | null;
  anggota: KelompokAnggotaPublik[];
}

/**
 * Ringkas anggota publik sebuah kelompok.
 *
 * Anggota diurutkan menurut jabatan lalu nama; ketua diambil dari jabatan
 * KETUA bila ada. Anggota yang disembunyikan operator tidak boleh masuk ke
 * fungsi ini (difilter saat query).
 */
export function ringkasAnggotaPublik(
  anggota: readonly KelompokAnggotaPublik[],
): RingkasanAnggotaPublik {
  const urut = [...anggota].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name, "id") || a.id - b.id,
  );

  return {
    jumlah: urut.length,
    ketua: urut.find((item) => item.position === JABATAN_KETUA)?.name ?? null,
    anggota: urut,
  };
}

/** Bentuk data kategori kelompok yang dikirim ke UI. */
export interface KategoriKelompokDTO {
  id: number;
  name: string;
  type: string;
  kelompokCount: number;
}

/**
 * Data referensi formulir kelompok.
 *
 * `penduduk` dipakai dialog anggota; `kategori` untuk memilih kategori sesuai
 * tipe kelompok yang dipilih.
 */
export interface KelompokReferenceData {
  kategori: LabelOption[];
  penduduk: LabelOption[];
}
