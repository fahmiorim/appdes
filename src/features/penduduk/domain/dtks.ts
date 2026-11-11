import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Slug resource RBAC untuk modul DTKS. */
export const DTKS_RESOURCE = RESOURCES.penduduk;

export const DTKS_VERSI = ["regsos_ek2022_k"] as const;
export type DtksVersi = (typeof DTKS_VERSI)[number];

export const DTKS_STATUS = ["draf", "terverifikasi"] as const;
export type DtksStatus = (typeof DTKS_STATUS)[number];

export const DTKS_VERSI_LABELS: Record<DtksVersi, string> = {
  regsos_ek2022_k: "REGSOS EK 2022 K",
};

export const DTKS_STATUS_LABELS: Record<DtksStatus, string> = {
  draf: "Draf",
  terverifikasi: "Terverifikasi",
};

/** Skema input pencatatan DTKS baru. */
export const dtksCreateSchema = z.object({
  rtmId: z.coerce.number().int().positive("Pilih Rumah Tangga."),
  keluargaId: z.coerce.number().int().positive().optional().nullable(),
  versiKuisioner: z.enum(DTKS_VERSI).default("regsos_ek2022_k"),
});

export type DtksCreateInput = z.infer<typeof dtksCreateSchema>;

/** Skema update metadata DTKS. */
export const dtksUpdateSchema = z.object({
  status: z.enum(DTKS_STATUS),
  tanggalPencacahan: z.string().optional().nullable(),
  tanggalPemeriksaan: z.string().optional().nullable(),
  namaPetugasPencacahan: z.string().trim().max(100).optional().nullable(),
  namaResponden: z.string().trim().max(100).optional().nullable(),
  keterangan: z.string().trim().max(2000).optional().nullable(),
});

export type DtksUpdateInput = z.infer<typeof dtksUpdateSchema>;

/** Baris daftar DTKS untuk UI admin. */
export interface DtksListRow {
  id: number;
  villageId: number;
  rtmNumber: string;
  rtmKepalaName: string;
  rtmKepalaNik: string | null;
  keluargaNumber: string | null;
  keluargaKepalaName: string | null;
  dusun: string | null;
  rw: string | null;
  rt: string | null;
  versiKuisioner: DtksVersi;
  status: DtksStatus;
  anggotaCount: number;
  updatedAt: string;
}

/** Detail satu data DTKS. */
export interface DtksDetailDTO {
  id: number;
  villageId: number;
  rtmId: number;
  keluargaId: number | null;
  versiKuisioner: DtksVersi;
  status: DtksStatus;
  tanggalPencacahan: string | null;
  tanggalPemeriksaan: string | null;
  namaPetugasPencacahan: string | null;
  namaResponden: string | null;
  keterangan: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Anggota DTKS. */
export interface DtksAnggotaRow {
  id: number;
  pendudukId: number;
  name: string;
  nationalId: string | null;
  gender: "male" | "female";
  birthDate: string | null;
  hubunganId: number | null;
  statusAnggota: string | null;
  keterangan: string | null;
}

export interface ListDtksParams {
  page: number;
  perPage: number;
  search?: string;
  status?: DtksStatus;
  dusun?: string;
}

export interface ListDtksResult {
  rows: DtksListRow[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}
