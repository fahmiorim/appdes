import { z } from "zod";

import {
  HEAD_OF_FAMILY_RELATION_ID,
  type Gender,
  type LifeStatus,
} from "@/features/penduduk/domain/penduduk";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { optionalSelectId, optionalText, type LabelOption } from "@/lib/forms";

/** Slug resource RBAC untuk modul keluarga (harus sama dengan `modules.slug`). */
export const KELUARGA_RESOURCE = RESOURCES.keluarga;

/**
 * `family_relations.id` untuk "KEPALA KELUARGA".
 *
 * Kepala keluarga tidak disimpan sebagai kolom, melainkan diturunkan dari
 * anggota yang punya hubungan keluarga ini.
 * Konstanta aslinya ada di domain penduduk agar aturan satu-kepala-per-KK dapat
 * ditegakkan saat menyimpan penduduk.
 */
export { HEAD_OF_FAMILY_RELATION_ID };

// --- Validasi formulir -----------------------------------------------------

/** Nomor Kartu Keluarga: tepat 16 angka (tanpa sentinel "belum dipilih"). */
const familyCardNumber = z
  .string()
  .trim()
  .regex(/^\d{16}$/, "Nomor KK harus 16 angka.");

/** Skema validasi input keluarga (dipakai di server action). */
export const keluargaFormSchema = z.object({
  number: familyCardNumber,
  address: optionalText(255),
  regionId: optionalSelectId,
});

export type KeluargaFormInput = z.infer<typeof keluargaFormSchema>;

// --- Bentuk data untuk UI --------------------------------------------------

/** Bentuk data keluarga yang dikirim ke UI (tanpa kolom internal). */
export interface KeluargaDTO {
  id: number;
  number: string;
  address: string | null;
  regionId: number | null;
}

/** Baris tabel keluarga: DTO ditambah data turunan hasil join/agregasi. */
export interface KeluargaListRow extends KeluargaDTO {
  headName: string | null;
  memberCount: number;
  regionLabel: string | null;
}

/** Satu anggota keluarga untuk tampilan rincian. */
export interface KeluargaMember {
  id: number;
  name: string;
  nationalId: string | null;
  gender: Gender;
  birthDate: string | null;
  relationName: string | null;
}

/**
 * Anggota keluarga dengan data lengkap untuk cetak Kartu Keluarga.
 *
 * Dipisahkan dari `KeluargaMember` karena formulir rincian hanya butuh kolom
 * ringkas, sedangkan KK memerlukan kolom baku (agama, pendidikan, pekerjaan,
 * nama ayah/ibu, dst.). Nama-nama atribut mengikuti urutan kolom KK agar
 * pemetaannya ke berkas cetak mudah ditelusuri.
 */
export interface KeluargaMemberDetail extends KeluargaMember {
  birthPlace: string | null;
  religionName: string | null;
  educationName: string | null;
  occupationName: string | null;
  maritalStatusName: string | null;
  bloodTypeName: string | null;
  citizenshipName: string | null;
  fatherName: string | null;
  motherName: string | null;
}

/** Data referensi yang dibutuhkan formulir keluarga. */
export interface KeluargaReferenceData {
  regions: LabelOption[];
}

/** Label ringkas keluarga, mis. "KK 3201012001120001". */
export function keluargaLabel(keluarga: Pick<KeluargaDTO, "number">): string {
  return `KK ${keluarga.number}`;
}

// --- Riwayat perubahan anggota ---------------------------------------------

/** Jenis perubahan keanggotaan yang dicatat. */
export const AKSI_LOG_ANGGOTA = ["added", "removed", "role_changed"] as const;
export type AksiLogAnggota = (typeof AKSI_LOG_ANGGOTA)[number];

export const AKSI_LOG_LABELS: Readonly<Record<AksiLogAnggota, string>> = {
  added: "Ditambahkan",
  removed: "Dikeluarkan",
  role_changed: "Hubungan berubah",
};

/** Keadaan keanggotaan seorang penduduk yang dibutuhkan untuk membandingkan. */
export interface AnggotaSnapshot {
  familyId: number | null;
  familyRelationId: number | null;
}

/** Satu perubahan yang harus dicatat pada sebuah KK. */
export interface PerubahanAnggota {
  familyId: number;
  aksi: AksiLogAnggota;
  /** Hubungan keluarga setelah perubahan (null saat dikeluarkan). */
  relationId: number | null;
}

/**
 * Tentukan perubahan keanggotaan KK dari keadaan sebelum → sesudah.
 *
 * Aturannya:
 * - sama-sama tanpa KK → tidak ada perubahan;
 * - KK sama tetapi hubungan berbeda → `role_changed`;
 * - pindah KK → `removed` pada KK lama **dan** `added` pada KK baru;
 * - masuk dari luar KK → `added`; keluar dari KK → `removed`.
 *
 * Fungsi murni ini dipakai saat menyimpan/mengubah/menghapus penduduk sehingga
 * riwayat selalu mencerminkan perubahan nyata, bukan setiap penyimpanan.
 */
export function bedakanPerubahanAnggota(
  sebelum: AnggotaSnapshot | null,
  sesudah: AnggotaSnapshot | null,
): PerubahanAnggota[] {
  const kkSebelum = sebelum?.familyId ?? null;
  const kkSesudah = sesudah?.familyId ?? null;
  const relSebelum = sebelum?.familyRelationId ?? null;
  const relSesudah = sesudah?.familyRelationId ?? null;

  if (kkSebelum === null && kkSesudah === null) return [];

  if (kkSebelum === kkSesudah) {
    if (relSebelum === relSesudah) return [];
    return [{ familyId: kkSesudah as number, aksi: "role_changed", relationId: relSesudah }];
  }

  const hasil: PerubahanAnggota[] = [];
  if (kkSebelum !== null) hasil.push({ familyId: kkSebelum, aksi: "removed", relationId: null });
  if (kkSesudah !== null) {
    hasil.push({ familyId: kkSesudah, aksi: "added", relationId: relSesudah });
  }
  return hasil;
}

/** Satu baris riwayat perubahan anggota untuk ditampilkan. */
export interface KeluargaAnggotaLog {
  id: number;
  createdAt: string;
  residentName: string;
  aksi: AksiLogAnggota;
  relationName: string | null;
  actorName: string | null;
}

/** Anggota KK pada halaman rincian (termasuk yang sudah meninggal/pindah). */
export interface KeluargaAnggotaRow {
  id: number;
  name: string;
  nationalId: string | null;
  gender: Gender;
  birthDate: string | null;
  lifeStatus: LifeStatus;
  relationId: number | null;
  relationName: string | null;
}

/** Data lengkap satu KK untuk halaman rincian. */
export interface KeluargaDetail {
  keluarga: KeluargaDTO;
  regionLabel: string | null;
  headName: string | null;
  members: KeluargaAnggotaRow[];
  logs: KeluargaAnggotaLog[];
}

// --- Cetak Kartu Keluarga --------------------------------------------------

/** Isi kolom "Jenis Kelamin" pada KK. */
export function genderLabelKk(gender: Gender): string {
  return gender === "male" ? "LAKI-LAKI" : "PEREMPUAN";
}

/**
 * Tampilkan tanggal ISO (`YYYY-MM-DD`) dalam format Indonesia (`DD-MM-YYYY`).
 *
 * KK memakai format bertanda hubung; mengembalikan `null` bila tanggal tidak
 * tersedia agar pemanggil dapat menuliskan tanda kosong.
 */
export function tanggalKk(iso: string | null): string | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return null;
  return `${day}-${month}-${year}`;
}

/** Nama kepala keluarga (anggota dengan hubungan "kepala keluarga"). */
export function kepalaKeluarga(
  anggota: readonly KeluargaMemberDetail[],
): KeluargaMemberDetail | null {
  return anggota.find((row) => row.relationName?.toUpperCase().includes("KEPALA")) ?? null;
}
