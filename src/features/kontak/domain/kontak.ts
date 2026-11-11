import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const KONTAK_RESOURCE = RESOURCES.daftarKontak;
export const GRUP_KONTAK_RESOURCE = RESOURCES.grupKontak;

export const kontakSchema = z.object({
  id: z.number().int().positive().optional(),
  villageId: z.number().int().positive(),
  residentId: z.number().int().positive().optional().nullable(),
  nama: z.string().min(1).max(100),
  telepon: z.string().max(20).optional().or(z.literal("")),
  email: z.string().max(100).optional().or(z.literal("")),
  telegram: z.string().max(50).optional().or(z.literal("")),
  hubungWarga: z.string().max(50).optional(),
  keterangan: z.string().optional().or(z.literal("")),
});

export type KontakInput = z.infer<typeof kontakSchema>;

export const kontakGrupSchema = z.object({
  id: z.number().int().positive().optional(),
  villageId: z.number().int().positive(),
  namaGrup: z.string().min(1).max(50),
  keterangan: z.string().optional().or(z.literal("")),
});

export type KontakGrupInput = z.infer<typeof kontakGrupSchema>;

/** Skema input anggota grup kontak (peran opsional). */
export const catatAnggotaGrupSchema = z.object({
  kontakId: z.coerce.number().int().positive("Pilih kontak."),
  peran: z.string().trim().max(50).optional().nullable(),
  keterangan: z.string().optional().or(z.literal("")),
});

export type CatatAnggotaGrupInput = z.infer<typeof catatAnggotaGrupSchema>;

/** Baris anggota grup untuk UI. */
export interface AnggotaGrupRow {
  id: number;
  kontakId: number;
  nama: string;
  telepon: string | null;
  email: string | null;
  telegram: string | null;
  peran: string | null;
  keterangan: string | null;
}
