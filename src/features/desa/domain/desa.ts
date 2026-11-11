import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";
import { optionalText } from "@/lib/forms";

/** Slug resource RBAC untuk modul identitas desa (harus sama dengan `modules.slug`). */
export const IDENTITAS_DESA_RESOURCE = RESOURCES.identitasDesa;

export const desaFormSchema = z.object({
  namaDesa: optionalText(100),
  kodeDesa: optionalText(10),
  kodePos: optionalText(5),
  namaKecamatan: optionalText(100),
  kodeKecamatan: optionalText(10),
  namaKabupaten: optionalText(100),
  kodeKabupaten: optionalText(10),
  namaPropinsi: optionalText(100),
  kodePropinsi: optionalText(10),
  alamatKantor: optionalText(255),
  namaKepalaDesa: optionalText(100),
  nipKepalaDesa: optionalText(30),
  emailDesa: optionalText(100).refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Format email tidak valid.",
  ),
  telepon: optionalText(30),
  website: optionalText(150),
  logo: optionalText(255),
  /** Jalur media gambar tanda tangan Kepala Desa (kategori umum). */
  tandaTangan: optionalText(255),
  /** Jalur media gambar stempel desa (kategori umum). */
  stempel: optionalText(255),
  /** 1–4; lihat `PENOMORAN_SURAT_MODES` di domain surat. */
  penomoranSurat: z.coerce.number().int().min(1).max(4).default(2),
});

export type DesaFormInput = z.infer<typeof desaFormSchema>;

/**
 * Identitas desa (domain).
 *
 * Nama field mengikuti kosakata domain aplikasi (Indonesia).
 */
export interface IdentitasDesaDTO {
  id: number;
  namaDesa: string | null;
  kodeDesa: string | null;
  kodePos: string | null;
  namaKecamatan: string | null;
  kodeKecamatan: string | null;
  namaKabupaten: string | null;
  kodeKabupaten: string | null;
  namaPropinsi: string | null;
  kodePropinsi: string | null;
  alamatKantor: string | null;
  namaKepalaDesa: string | null;
  nipKepalaDesa: string | null;
  emailDesa: string | null;
  telepon: string | null;
  website: string | null;
  logo: string | null;
  /** Jalur media gambar tanda tangan Kepala Desa. */
  tandaTangan: string | null;
  /** Jalur media gambar stempel desa. */
  stempel: string | null;
  penomoranSurat: number;
}

/** Label ringkas untuk kepentingan tampilan. */
export function desaLabel(desa: Pick<IdentitasDesaDTO, "namaDesa" | "kodeDesa">): string {
  if (desa.namaDesa && desa.kodeDesa) return `${desa.namaDesa} (${desa.kodeDesa})`;
  if (desa.namaDesa) return desa.namaDesa;
  if (desa.kodeDesa) return desa.kodeDesa;
  return "Desa";
}
