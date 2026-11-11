import { z } from "zod";

import { SURAT_PLACEHOLDERS } from "./surat";

/**
 * Isian dinamis per jenis surat.
 *
 * Setiap jenis surat dapat mendefinisikan kode isian sendiri (mis.
 * `nama_proyek`, `jumlah_kubo`). Nilai isian disimpan pada surat sebagai JSON
 * map `kode → nilai` dan disisipkan ke badan surat lewat placeholder
 * `[kode_isian]` saat surat diterbitkan.
 */

/** Awalan nama field isian pada formulir surat (`isian.<kode>`). */
export const ISIAN_FIELD_PREFIX = "isian.";
export const ISIAN_TIPES = ["text", "textarea", "number", "date", "select", "checkbox"] as const;
export type IsianTipe = (typeof ISIAN_TIPES)[number];

export const ISIAN_TIPE_LABELS: Readonly<Record<IsianTipe, string>> = {
  text: "Teks pendek",
  textarea: "Teks panjang",
  number: "Angka",
  date: "Tanggal",
  select: "Pilihan",
  checkbox: "Centang",
};

const kodeIsianSchema = z
  .string()
  .trim()
  .min(1, "Kode isian wajib diisi.")
  .max(40, "Maksimal 40 karakter.")
  .regex(
    /^[a-z0-9_]+$/,
    "Kode isian hanya boleh huruf kecil, angka, dan garis bawah (mis. nama_proyek).",
  );

export const isianFieldSchema = z.object({
  kode: kodeIsianSchema,
  label: z.string().trim().min(1, "Label isian wajib diisi.").max(150),
  tipe: z.enum(ISIAN_TIPES),
  required: z.boolean().default(false),
  /** Pilihan untuk tipe `select`. */
  opsi: z.array(z.string().trim().min(1, "Pilihan tidak boleh kosong.")).default([]),
  placeholder: z.string().trim().max(100).optional(),
});
export type IsianField = z.infer<typeof isianFieldSchema>;

/** Placeholder bawaan yang tidak boleh dipakai sebagai kode isian kustom. */
export const RESERVED_ISIAN_KODES: ReadonlySet<string> = new Set([
  ...SURAT_PLACEHOLDERS.map((item) => item.key),
  "format_nomor_surat",
  "mulai_berlaku",
  "pengikut_surat",
]);

/**
 * Baca daftar isian dari JSON.
 *
 * Data rusak tidak boleh menggagalkan halaman, sehingga isian yang tidak valid
 * dilewati dan sisanya tetap dipakai.
 */
export function parseIsianFields(raw: string | null | undefined): IsianField[] {
  if (!raw || raw.trim() === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const fields: IsianField[] = [];
  for (const item of parsed) {
    const result = isianFieldSchema.safeParse(item);
    if (result.success) fields.push(result.data);
  }
  return fields;
}

/** Simpan daftar isian sebagai JSON (urutan kode dijaga). */
export function serializeIsianFields(fields: readonly IsianField[]): string {
  return JSON.stringify(fields);
}

/**
 * Validasi daftar isian: kode unik, tidak bentrok dengan placeholder bawaan.
 * Mengembalikan pesan galat pertama bila ada yang bermasalah.
 */
export function validateIsianFields(fields: readonly IsianField[]): string | null {
  const seen = new Set<string>();

  for (const field of fields) {
    if (RESERVED_ISIAN_KODES.has(field.kode)) {
      return `Kode isian "${field.kode}" sudah dipakai placeholder bawaan surat.`;
    }
    if (seen.has(field.kode)) {
      return `Kode isian "${field.kode}" duplikat.`;
    }
    if (field.tipe === "select" && field.opsi.length === 0) {
      return `Isian "${field.kode}" bertipe pilihan harus memiliki minimal satu opsi.`;
    }
    seen.add(field.kode);
  }

  return null;
}

/** Daftar id syarat surat dari JSON. */
export function parseSyaratIds(raw: string | null | undefined): number[] {
  if (!raw || raw.trim() === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const ids = new Set<number>();
  for (const item of parsed) {
    const value = Number(item);
    if (Number.isInteger(value) && value > 0) ids.add(value);
  }
  return [...ids].sort((a, b) => a - b);
}

/** Simpan daftar id syarat surat sebagai JSON. */
export function serializeSyaratIds(ids: readonly number[]): string {
  const unique = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  return JSON.stringify(unique.sort((a, b) => a - b));
}

/** Ambil nilai isian yang dikirim formulir (hanya kode yang dikenal). */
export function buildIsianValues(
  fields: readonly IsianField[],
  raw: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const field of fields) {
    const value = raw[field.kode];
    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    if (trimmed === "") continue;

    values[field.kode] =
      field.tipe === "checkbox" ? (trimmed === "true" ? "Ya" : "Tidak") : trimmed;
  }

  return values;
}

/**
 * Periksa isian wajib.
 *
 * Mengembalikan peta `kode → pesan` untuk isian wajib yang kosong.
 */
export function validateIsianValues(
  fields: readonly IsianField[],
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!field.required) continue;

    const value = values[field.kode]?.trim() ?? "";
    if (value === "") {
      errors[field.kode] = `${field.label} wajib diisi.`;
    }
  }

  return errors;
}

/**
 * Ubah peta kesalahan isian menjadi bentuk `FieldErrors`.
 *
 * Kunci memakai awalan `isian.` supaya UI dapat menandai field yang bermasalah
 * pada formulir surat.
 */
export function isianErrorsToFieldErrors(
  errors: Readonly<Record<string, string>>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [kode, message] of Object.entries(errors)) {
    result[`isian.${kode}`] = [message];
  }
  return result;
}

/** Baca nilai isian tersimpan pada surat. */
export function parseNilaiIsian(raw: string | null | undefined): Record<string, string> {
  if (!raw || raw.trim() === "") return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") values[key] = value;
    }
    return values;
  } catch {
    return {};
  }
}

/** Simpan nilai isian surat sebagai JSON. */
export function serializeNilaiIsian(values: Readonly<Record<string, string>>): string {
  return JSON.stringify(values);
}

// --- Master syarat surat ---------------------------------------------------

export const syaratSuratFormSchema = z.object({
  name: z.string().trim().min(1, "Nama syarat wajib diisi.").max(150),
  description: z.string().trim().max(1000).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});
export type SyaratSuratInput = z.infer<typeof syaratSuratFormSchema>;

export interface SyaratSuratDTO {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}
