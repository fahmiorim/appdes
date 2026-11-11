import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const ANALISIS_RESOURCE = RESOURCES.analisis;

export const kategoriAnalisisSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(100),
  keterangan: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export const indikatorAnalisisSchema = z.object({
  kategoriId: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  kode: z.string().trim().min(1, "Kode wajib diisi").max(20),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(200),
  bobot: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 1 : value),
    z.coerce.number().int().min(1, "Bobot minimal 1.").max(100, "Bobot maksimal 100."),
  ),
  keterangan: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type KategoriAnalisisInput = z.input<typeof kategoriAnalisisSchema>;
export type IndikatorAnalisisInput = z.input<typeof indikatorAnalisisSchema>;

export interface AnalisisKategoriDTO {
  id: number;
  villageId: number;
  nama: string;
  keterangan: string | null;
}

export interface AnalisisIndikatorDTO {
  id: number;
  villageId: number;
  kategoriId: number | null;
  kode: string;
  nama: string;
  /** Bobot indikator untuk perhitungan skor (1–100). */
  bobot: number;
  keterangan: string | null;
}
