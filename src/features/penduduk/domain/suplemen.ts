import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const SUPLEMEN_RESOURCE = RESOURCES.suplemen;

export const SASARAN_PENDUDUK = 1;
export const SASARAN_KELUARGA = 2;

export const SASARAN_LABELS: Record<number, string> = {
  [SASARAN_PENDUDUK]: "Penduduk",
  [SASARAN_KELUARGA]: "Keluarga (KK)",
};

export const suplemenFormFieldSchema = z.object({
  label: z.string().min(1).max(100),
  tipe: z.string().min(1).max(50),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
});

export const suplemenCreateSchema = z.object({
  nama: z.string().min(1, "Nama suplemen wajib diisi.").max(200),
  sasaran: z.coerce.number().int().default(SASARAN_PENDUDUK),
  keterangan: z.string().max(1000).optional().nullable(),
  dataFormIsian: z.array(suplemenFormFieldSchema).optional().default([]),
});

export type SuplemenCreateInput = z.infer<typeof suplemenCreateSchema>;

export const suplemenUpdateSchema = suplemenCreateSchema.extend({
  id: z.coerce.number().int().positive(),
});

export type SuplemenUpdateInput = z.infer<typeof suplemenUpdateSchema>;

export interface SuplemenListRow {
  id: number;
  nama: string;
  slug: string;
  sasaran: number;
  keterangan: string | null;
  terdataCount: number;
  updatedAt: string;
}

export interface ListSuplemenParams {
  page: number;
  perPage: number;
  search?: string;
  sasaran?: number;
}

export interface ListSuplemenResult {
  rows: SuplemenListRow[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

export const suplemenTerdataSchema = z
  .object({
    suplemenId: z.coerce.number().int().positive(),
    pendudukId: z.coerce.number().int().positive().optional().nullable(),
    keluargaId: z.coerce.number().int().positive().optional().nullable(),
    /** Isian dinamis per suplemen (kolom bebas yang dibentuk petugas). */
    isian: z.record(z.string(), z.string()).optional(),
  })
  .refine((value) => Boolean(value.pendudukId) !== Boolean(value.keluargaId), {
    message: "Pilih salah satu sasaran: penduduk atau keluarga.",
  });

export type SuplemenTerdataInput = z.infer<typeof suplemenTerdataSchema>;

export interface SuplemenTerdataRow {
  id: number;
  pendudukId: number | null;
  keluargaId: number | null;
  label: string;
  /** Kolom isian dinamis terdata (lihat `suplemen-berkas.ts`). */
  isian: Record<string, string>;
  createdAt: string;
}

export interface SuplemenOption {
  id: number;
  label: string;
}
