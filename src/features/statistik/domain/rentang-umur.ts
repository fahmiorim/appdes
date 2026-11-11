import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Slug resource RBAC untuk modul statistik penduduk (rentang umur). */
export const RENTANG_UMUR_RESOURCE = RESOURCES.laporanPenduduk;

/** Skema validasi input rentang umur. */
export const rentangUmurFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama rentang wajib diisi.").max(60, "Maksimal 60 karakter."),
  dari: z.coerce.number().int().min(0, "Batas bawah minimal 0."),
  /** `sampai` opsional — `null` berarti tanpa batas atas. */
  sampai: z
    .union([z.null(), z.undefined(), z.coerce.number().int().min(0)])
    .optional()
    .nullable(),
});

export type RentangUmurFormInput = z.infer<typeof rentangUmurFormSchema>;

/** Bentuk data rentang umur untuk UI. */
export interface RentangUmurDTO {
  id: number;
  villageId: number;
  nama: string;
  dari: number;
  /** `null` = tanpa batas atas. */
  sampai: number | null;
  status: boolean;
}

/** Range yang dipakai saat mengagregasi penduduk per rentang umur. */
export interface UmurRange {
  label: string;
  min: number;
  /** `null` = tanpa batas atas. */
  max: number | null;
}
