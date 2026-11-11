import { z } from "zod";

import type { AnggotaKeluargaSurat } from "./surat";

/**
 * Pengikut surat & penduduk luar desa.
 *
 * - Pengikut = penduduk desa lain yang menyertai pemerintah/dataran surat,
 *   identik dengan placeholder `pengikut<n>_*`.
 * - Penduduk luar = orang di luar database penduduk desa, diisi manual pada
 *   formulir dan memakai placeholder `luar<n>_*`.
 *
 * Keduanya disimpan pada `nilaiIsian` JSON surat memakai kunci tersembunyi
 * `__pengikut` (CSV id penduduk) dan `__luar` (JSON baris), tanpa migrasi.
 * Kode isian kustom tidak bisa bentrok karena validasi isian hanya menerima
 * `[a-z0-9_]+` (tidak boleh diawali garis bawah).
 */

export const MAKS_PENGIKUT = 10;
export const MAKS_PENDUDUK_LUAR = 10;

/** Kunci nilaiIsian tersembunyi ini milik modul pengikut. */
export const KUNCI_ISIAN_PENGIKUT = "__pengikut";
export const KUNCI_ISIAN_LUAR = "__luar";

/** Baris penduduk luar desa yang diisi manual pada formulir surat. */
export const PENDDUDUK_LUAR_FIELDS = [
  "nama",
  "nik",
  "jenisKelamin",
  "tempatLahir",
  "tanggalLahir",
  "pekerjaan",
  "alamat",
  "keterangan",
] as const;

export const pendudukLuarSchema = z.object({
  nama: z.string().trim().min(1, "Nama penduduk luar wajib diisi.").max(100),
  nik: z.string().trim().max(30).default(""),
  jenisKelamin: z.string().trim().max(20).default(""),
  tempatLahir: z.string().trim().max(100).default(""),
  tanggalLahir: z.string().trim().max(30).default(""),
  pekerjaan: z.string().trim().max(100).default(""),
  alamat: z.string().trim().max(200).default(""),
  keterangan: z.string().trim().max(150).default(""),
});
export type PendudukLuarSurat = z.infer<typeof pendudukLuarSchema>;

/** Baca daftar id pengikut dari nilaiIsian (`__pengikut`, CSV). */
export function parsePengikutIds(raw: string | null | undefined): number[] {
  if (!raw) return [];

  const ids: number[] = [];
  for (const bagian of raw.split(",")) {
    const id = Number(bagian);
    if (Number.isInteger(id) && id > 0) ids.push(id);
  }

  return [...new Set(ids)].slice(0, MAKS_PENGIKUT);
}

/** Simpan daftar id pengikut ke CSV untuk kunci `__pengikut`. */
export function serializePengikutIds(ids: readonly number[]): string {
  const unik = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  return unik.slice(0, MAKS_PENGIKUT).join(",");
}

/** Baca baris penduduk luar dari kunci `__luar` (JSON). */
export function parsePendudukLuar(raw: string | null | undefined): PendudukLuarSurat[] {
  if (!raw || raw.trim() === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const baris: PendudukLuarSurat[] = [];
  for (const item of parsed) {
    const hasil = pendudukLuarSchema.safeParse(item);
    if (hasil.success) baris.push(hasil.data);
  }

  return baris.slice(0, MAKS_PENDUDUK_LUAR);
}

/** Simpan baris penduduk luar sebagai JSON untuk kunci `__luar`. */
export function serializePendudukLuar(rows: readonly PendudukLuarSurat[]): string {
  return JSON.stringify(rows.slice(0, MAKS_PENDUDUK_LUAR));
}

/** Nilai "-" bila kosong, dipakai merata di baris pengikut/luar. */
function isi(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : "-";
}

/** Kode yang tersedia per baris (untuk bantuan di UI template). */ export const PENGIKUT_PLACEHOLDER_CODES =
  [
    "no",
    "nik",
    "nama",
    "jenis_kelamin",
    "ttl",
    "tempat_tgl_lahir",
    "tempat_lahir",
    "tanggal_lahir",
    "usia",
    "pekerjaan",
    "alamat",
    "keterangan",
  ] as const;

/** Nilai satu baris; dipakai bersama untuk prefix `pengikut` dan `luar`. */
function isiBaris(
  values: Record<string, string>,
  dasar: string,
  index: number,
  data: {
    nama: string;
    nik?: string | null;
    jenisKelamin?: string | null;
    tanggalLahir?: string | null;
    tempatLahir?: string | null;
    tanggalLahirFormatted?: string | null;
    usia?: string | null;
    pekerjaan?: string | null;
    alamat?: string | null;
    keterangan?: string | null;
  },
): void {
  const prefix = `${dasar}${index}_`;
  const ttl = [isi(data.tempatLahir), isi(data.tanggalLahirFormatted ?? data.tanggalLahir)]
    .filter((part) => part !== "-")
    .join(", ");

  values[`${prefix}no`] = String(index);
  values[`${prefix}nik`] = isi(data.nik);
  values[`${prefix}nama`] = isi(data.nama);
  values[`${prefix}jenis_kelamin`] = isi(data.jenisKelamin);
  values[`${prefix}ttl`] = ttl || "-";
  values[`${prefix}tempat_tgl_lahir`] = ttl || "-";
  values[`${prefix}tempat_lahir`] = isi(data.tempatLahir);
  values[`${prefix}tanggal_lahir`] = isi(data.tanggalLahirFormatted ?? data.tanggalLahir);
  values[`${prefix}usia`] = isi(data.usia);
  values[`${prefix}pekerjaan`] = isi(data.pekerjaan);
  values[`${prefix}alamat`] = isi(data.alamat);
  values[`${prefix}keterangan`] = isi(data.keterangan);
}

/**
 * Bentuk placeholder pengikut (`pengikut1_*` … `pengikut10_*`), penduduk
 * luar (`luar1_*` … `luar10_*`), dan rekapnya (`pengikut_jumlah`,
 * `pengikut_daftar`, `luar_jumlah`, `luar_daftar`).
 *
 * Baris yang tidak ada mempertahankan placeholder asli di template
 * (lihat `renderSuratTemplate`).
 */
export function buildPengikutPlaceholders(
  pengikut: readonly AnggotaKeluargaSurat[],
  luar: readonly PendudukLuarSurat[],
): Record<string, string> {
  const values: Record<string, string> = {};

  pengikut.slice(0, MAKS_PENGIKUT).forEach((item, index) => {
    isiBaris(values, "pengikut", index + 1, {
      nama: item.nama,
      nik: item.nik,
      jenisKelamin: item.jenisKelamin,
      tempatLahir: item.tempatLahir,
      tanggalLahir: null,
      tanggalLahirFormatted: item.tanggalLahir,
      usia: item.usia,
      pekerjaan: item.pekerjaan,
      alamat: item.alamat,
      keterangan: item.hubunganKk,
    });
  });

  luar.slice(0, MAKS_PENDUDUK_LUAR).forEach((item, index) => {
    isiBaris(values, "luar", index + 1, {
      nama: item.nama,
      nik: item.nik,
      jenisKelamin: item.jenisKelamin,
      tempatLahir: item.tempatLahir,
      tanggalLahir: item.tanggalLahir,
      tanggalLahirFormatted: item.tanggalLahir,
      usia: null,
      pekerjaan: item.pekerjaan,
      alamat: item.alamat,
      keterangan: item.keterangan,
    });
  });

  values.pengikut_jumlah = String(Math.min(pengikut.length, MAKS_PENGIKUT));
  values.pengikut_daftar = pengikut
    .slice(0, MAKS_PENGIKUT)
    .map((item) => (item.nik ? `${item.nama} (${item.nik})` : item.nama))
    .join("; ");
  values.luar_jumlah = String(Math.min(luar.length, MAKS_PENDUDUK_LUAR));
  values.luar_daftar = luar
    .slice(0, MAKS_PENDUDUK_LUAR)
    .map((item) => item.nama)
    .join("; ");

  return values;
}

// ── Formulir surat admin ────────────────────────────────────────────────────

/**
 * Susun baris penduduk luar dari FormData.
 *
 * Baris dikirim dengan nama `luar_nama_<i>`, `luar_nik_<i>`, dst.; indeks
 * `i` 1..`jumlah` mengikuti input `luar_jumlah`. Baris tanpa nama diabaikan.
 */
export function kumpulkanPendudukLuar(formData: FormData): PendudukLuarSurat[] {
  const jumlahRaw = formData.get("luar_jumlah");
  const jumlah = typeof jumlahRaw === "string" ? Number(jumlahRaw) : 0;
  if (!Number.isInteger(jumlah) || jumlah <= 0) return [];

  const baris: PendudukLuarSurat[] = [];
  for (let i = 1; i <= Math.min(jumlah, MAKS_PENDUDUK_LUAR); i += 1) {
    const hasil = pendudukLuarSchema.safeParse({
      nama: formData.get(`luar_nama_${i}`) ?? "",
      nik: formData.get(`luar_nik_${i}`) ?? "",
      jenisKelamin: formData.get(`luar_jenis_kelamin_${i}`) ?? "",
      tempatLahir: formData.get(`luar_tempat_lahir_${i}`) ?? "",
      tanggalLahir: formData.get(`luar_tanggal_lahir_${i}`) ?? "",
      pekerjaan: formData.get(`luar_pekerjaan_${i}`) ?? "",
      alamat: formData.get(`luar_alamat_${i}`) ?? "",
      keterangan: formData.get(`luar_keterangan_${i}`) ?? "",
    });

    if (hasil.success) baris.push(hasil.data);
  }

  return baris;
}
