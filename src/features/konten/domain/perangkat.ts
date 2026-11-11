import { z } from "zod";

import { buatSlug } from "@/features/publik/domain/slug";
import { RESOURCES } from "@/features/rbac/domain/resources";
import {
  isBlankSelection,
  optionalDigits,
  optionalIsoDate,
  optionalSelectId,
  optionalText,
} from "@/lib/forms";

/**
 * Perangkat desa & jabatan.
 *
 * `jabatan_perangkat` adalah katalog jabatan (Kepala Desa, Kaur, dst.);
 * `perangkat_desa` adalah aparatur yang menjabat. Keduanya milik satu desa.
 * Domain ini murni; unggah foto dan sanitasi dilakukan application layer.
 */

export const PERANGKAT_DESA_RESOURCE = RESOURCES.perangkatDesa;

export const STATUS_PERANGKAT = ["aktif", "nonaktif"] as const;
export type StatusPerangkat = (typeof STATUS_PERANGKAT)[number];

export const STATUS_PERANGKAT_LABELS: Readonly<Record<StatusPerangkat, string>> = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
};

export const JENIS_KELAMIN = ["male", "female"] as const;
export type JenisKelamin = (typeof JENIS_KELAMIN)[number];

export const JENIS_KELAMIN_LABELS: Readonly<Record<JenisKelamin, string>> = {
  male: "Laki-laki",
  female: "Perempuan",
};

/** Label jenis kelamin, atau "—" bila kosong. */
export function labelJenisKelamin(nilai: string | null): string {
  return nilai === "male" || nilai === "female" ? JENIS_KELAMIN_LABELS[nilai] : "—";
}

/** Label status perangkat, default "Aktif" untuk nilai tak dikenal. */
export function labelStatusPerangkat(nilai: string): string {
  return nilai === "nonaktif" ? STATUS_PERANGKAT_LABELS.nonaktif : STATUS_PERANGKAT_LABELS.aktif;
}

/** Periode menjabat perangkat. Format: "YYYY" atau "YYYY-YYYY". */
export const PERIODE_JABATAN = ["aktif"] as const;
export type PeriodeJabatan = (typeof PERIODE_JABATAN)[number];

export const PERIODE_JABATAN_LABELS: Readonly<Record<PeriodeJabatan, string>> = {
  aktif: "Aktif",
};

/** Skema form jabatan. */
export const jabatanFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama jabatan wajib diisi.").max(100, "Maksimal 100 karakter."),
  urut: z.coerce
    .number({ error: "Urutan harus angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .max(999, "Urutan maksimal 999.")
    .default(0),
});

export type JabatanFormInput = z.infer<typeof jabatanFormSchema>;

/** Jenis kelamin dari select: sentinel kosong → `null`. */
const optionalJenisKelamin = z.preprocess(
  (value) => (isBlankSelection(value) ? null : value),
  z.enum(JENIS_KELAMIN, { error: "Jenis kelamin tidak valid." }).nullable(),
);

/** Skema form perangkat desa. */
export const perangkatFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(100, "Maksimal 100 karakter."),
  jabatanId: optionalSelectId,
  gelarDepan: optionalText(100),
  gelarBelakang: optionalText(100),
  nip: optionalText(25),
  nik: optionalDigits(16),
  jenisKelamin: optionalJenisKelamin,
  tempatLahir: optionalText(100),
  tanggalLahir: optionalIsoDate,
  penandaTangan: z.boolean().default(false),
  status: z.enum(STATUS_PERANGKAT, { error: "Status perangkat tidak valid." }).default("aktif"),
  periode: optionalText(20),
  urut: z.coerce
    .number({ error: "Urutan harus angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .max(999, "Urutan maksimal 999.")
    .default(0),
});

export type PerangkatFormInput = z.infer<typeof perangkatFormSchema>;

/**
 * Slug jabatan dari nama; tidak pernah kosong.
 *
 * Kolom `jabatan_perangkat.slug` hanya 100 karakter. Akhiran unik `-2` … `-200`
 * memakai maksimal 4 karakter, jadi slug dasar dibatasi 96 karakter.
 */
export function slugJabatan(nama: string): string {
  const dasar = buatSlug(nama, 96);
  return dasar === "" ? "jabatan" : dasar;
}

/** Baris jabatan pada halaman admin. */
export interface JabatanAdminRow {
  id: number;
  nama: string;
  slug: string;
  urut: number;
  jumlahPerangkat: number;
}

/** Pilihan jabatan untuk form perangkat. */
export interface JabatanOption {
  id: number;
  nama: string;
}

/** Data perangkat untuk daftar dan form ubah. */
export interface PerangkatAdmin {
  id: number;
  nama: string;
  gelarDepan: string | null;
  gelarBelakang: string | null;
  jabatanId: number | null;
  jabatan: string | null;
  nip: string | null;
  nik: string | null;
  jenisKelamin: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  foto: string | null;
  penandaTangan: boolean;
  status: string;
  periode: string | null;
  urut: number;
}
