import { z } from "zod";

export const PERMOHONAN_STATUS = ["0", "1", "2", "3", "4", "5"] as const;
export type PermohonanStatus = (typeof PERMOHONAN_STATUS)[number];

export const PERMOHONAN_STATUS_LABELS: Record<PermohonanStatus, string> = {
  "0": "Belum Lengkap",
  "1": "Sedang Diperiksa",
  "2": "Menunggu Tandatangan",
  "3": "Siap Diambil",
  "4": "Sudah Diambil",
  "5": "Dibatalkan",
};

/**
 * Transisi status yang sah.
 *
 * Operator tidak boleh melompati tahap (mis. 1 → 4) atau menghidupkan kembali
 * permohonan yang sudah selesai. Warga hanya dapat membatalkan selama belum
 * diambil; operator dapat mengembalikan ke 0 dengan alasan.
 */
export const PERMOHONAN_TRANSITIONS: Record<PermohonanStatus, readonly PermohonanStatus[]> = {
  "0": ["1", "5"],
  "1": ["0", "2", "5"],
  "2": ["0", "3", "5"],
  "3": ["4", "5"],
  "4": [],
  "5": [],
};

export function canTransitionPermohonan(dari: PermohonanStatus, ke: PermohonanStatus): boolean {
  return PERMOHONAN_TRANSITIONS[dari].includes(ke);
}

export function statusPermohonan(value: number): PermohonanStatus | null {
  const text = String(value);
  return (PERMOHONAN_STATUS as readonly string[]).includes(text)
    ? (text as PermohonanStatus)
    : null;
}

export function labelPermohonanStatus(value: number): string {
  const status = statusPermohonan(value);
  return status ? PERMOHONAN_STATUS_LABELS[status] : "Tidak diketahui";
}

/**
 * Skema form permohonan.
 *
 * `residentId` sengaja **tidak** ada di sini: identitas warga selalu diambil
 * dari sesi. Menambahkannya ke form akan mengundang IDOR.
 */
export const permohonanSuratFormSchema = z.object({
  idSurat: z.coerce.number().int().min(1),
  isianForm: z.string().optional().or(z.literal("")),
  noHpAktif: z.string().trim().max(50).optional().or(z.literal("")),
  keterangan: z.string().trim().max(500).optional().or(z.literal("")),
});
export type PermohonanSuratInput = z.infer<typeof permohonanSuratFormSchema>;

/** Baris permohonan untuk tabel operator. */
export interface PermohonanAdminRow {
  id: number;
  idPemohon: number;
  idSurat: number;
  letterId: number | null;
  status: number;
  alasan: string | null;
  keterangan: string | null;
  noAntrian: string | null;
  syarat: string | null;
  isianForm: string | null;
  noHpAktif: string | null;
  createdAt: Date | null;
  namaSurat: string | null;
  formIsian: string | null;
  namaPemohon: string | null;
  nikPemohon: string | null;
  letterNumber: string | null;
}

/** Syarat surat yang harus disiapkan warga. */
export interface SyaratSuratWarga {
  id: number;
  nama: string;
  keterangan: string | null;
}

/** Jenis surat aktif beserta syarat & isian dinamis. */
export interface JenisSuratWarga {
  id: number;
  kode: string;
  nama: string;
  formIsian: string | null;
  syarat: SyaratSuratWarga[];
}

/** Berkas syarat yang sudah diunggah dan disimpan di media privat. */
export interface BerkasSyarat {
  id: number;
  nama: string;
  berkas: string;
  mime: string;
  namaAsli: string;
}

/** Baca daftar berkas syarat dari JSON; data rusak diabaikan. */
export function parseBerkasSyarat(raw: string | null | undefined): BerkasSyarat[] {
  if (!raw || raw.trim() === "") return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const result: BerkasSyarat[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id = Number(row.id);
      if (
        !Number.isInteger(id) ||
        id < 1 ||
        typeof row.nama !== "string" ||
        typeof row.berkas !== "string" ||
        typeof row.mime !== "string"
      ) {
        continue;
      }
      result.push({
        id,
        nama: row.nama,
        berkas: row.berkas,
        mime: row.mime,
        namaAsli: typeof row.namaAsli === "string" ? row.namaAsli : "berkas",
      });
    }
    return result;
  } catch {
    return [];
  }
}

/** Simpan daftar berkas syarat sebagai JSON. */
export function serializeBerkasSyarat(items: readonly BerkasSyarat[]): string {
  return JSON.stringify(items);
}

/** Status permohonan yang boleh diubah operator. */
export function isPermohonanStatus(value: number): boolean {
  return (PERMOHONAN_STATUS as readonly string[]).includes(String(value));
}
