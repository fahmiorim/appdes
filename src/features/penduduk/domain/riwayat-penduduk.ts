import { z } from "zod";

import { optionalDigits, optionalIsoDate, optionalSelectId, optionalText } from "@/lib/forms";
import {
  RESIDENT_MUTATION_TYPE_LABELS,
  RESIDENT_MUTATION_TYPES,
  type ResidentMutationType,
} from "@/lib/resident-mutation";

import { toCsv } from "./laporan-penduduk";
import { LIFE_STATUSES } from "./penduduk";

export const MUTATION_TYPES = RESIDENT_MUTATION_TYPES;
export type MutationType = ResidentMutationType;

export const MUTATION_TYPE_LABELS = RESIDENT_MUTATION_TYPE_LABELS;

export const mutationTypeSchema = z.enum(MUTATION_TYPES);

export function normalisasiMutationType(value: string | null | undefined): MutationType | "all" {
  return (MUTATION_TYPES as readonly string[]).includes(value ?? "")
    ? (value as MutationType)
    : "all";
}

export function normalisasiTanggal(value: string | null | undefined): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export const catatKelahiranSchema = z.object({
  eventDate: z.iso.date("Tanggal lahir tidak valid."),
  name: z.string().trim().min(1, "Nama wajib diisi.").max(100, "Maksimal 100 karakter."),
  nationalId: optionalDigits(16),
  gender: z.enum(["male", "female"]).optional().or(z.literal("")),
  familyId: optionalSelectId,
  regionId: optionalSelectId,
  address: optionalText(255),
  fatherName: optionalText(100),
  motherName: optionalText(100),
  reason: optionalText(255),
  notes: optionalText(1000),
  referenceNo: optionalText(100),
});

export type CatatKelahiranInput = z.infer<typeof catatKelahiranSchema>;

export const catatKematianSchema = z.object({
  residentId: z.coerce.number().int().positive("Pilih penduduk."),
  eventDate: z.iso.date("Tanggal meninggal tidak valid."),
  reason: optionalText(255),
  notes: optionalText(1000),
  referenceNo: optionalText(100),
});

export type CatatKematianInput = z.infer<typeof catatKematianSchema>;

export const catatPindahKeluarSchema = z.object({
  residentId: z.coerce.number().int().positive("Pilih penduduk."),
  eventDate: z.iso.date("Tanggal pindah tidak valid."),
  toAddress: optionalText(255),
  destination: optionalText(255),
  reason: optionalText(255),
  notes: optionalText(1000),
  referenceNo: optionalText(100),
});

export type CatatPindahKeluarInput = z.infer<typeof catatPindahKeluarSchema>;

export const catatDatangSchema = z.object({
  eventDate: z.iso.date("Tanggal datang tidak valid."),
  name: z.string().trim().min(1, "Nama wajib diisi.").max(100, "Maksimal 100 karakter."),
  nationalId: optionalDigits(16),
  gender: z.enum(["male", "female"]).optional().or(z.literal("")),
  birthDate: optionalIsoDate,
  birthPlace: optionalText(100),
  familyId: optionalSelectId,
  regionId: optionalSelectId,
  address: optionalText(255),
  fromAddress: optionalText(255),
  reason: optionalText(255),
  notes: optionalText(1000),
  referenceNo: optionalText(100),
});

export type CatatDatangInput = z.infer<typeof catatDatangSchema>;

export const catatPerubahanSchema = z.object({
  residentId: z.coerce.number().int().positive("Pilih penduduk."),
  eventDate: z.iso.date("Tanggal perubahan tidak valid."),
  lifeStatus: z.enum(LIFE_STATUSES, { error: "Status kependudukan tidak valid." }),
  reason: optionalText(255),
  notes: optionalText(1000),
  referenceNo: optionalText(100),
});

export type CatatPerubahanInput = z.infer<typeof catatPerubahanSchema>;

export interface RiwayatPendudukRow {
  id: number;
  villageId: number;
  residentId: number | null;
  type: MutationType;
  eventDate: string;
  reportedAt: Date;
  actorId: string | null;
  reason: string | null;
  notes: string | null;
  referenceNo: string | null;
  fromRegionId: number | null;
  toRegionId: number | null;
  fromAddress: string | null;
  toAddress: string | null;
  meta: unknown;
  residentName: string | null;
  residentNationalId: string | null;
  actorName: string | null;
}

export interface ListRiwayatParams {
  page?: number;
  perPage?: number;
  type?: MutationType | "all";
  q?: string;
  from?: string;
  to?: string;
}

export interface ListRiwayatResult {
  rows: RiwayatPendudukRow[];
  total: number;
  page: number;
  perPage: number;
}

/** Teks CSV riwayat penduduk, memakai pemisah dan BOM yang sama dengan laporan. */
export function buildRiwayatPendudukCsv(input: {
  namaDesa: string | null;
  rows: RiwayatPendudukRow[];
}): string {
  const rows: string[][] = [
    ["Riwayat Penduduk"],
    ["Desa", input.namaDesa ?? "-"],
    [],
    ["Tanggal", "Jenis", "Nama", "NIK", "No. Surat", "Alasan", "Keterangan"],
    ...input.rows.map((row) => [
      row.eventDate,
      MUTATION_TYPE_LABELS[row.type] ?? row.type,
      row.residentName ?? "-",
      row.residentNationalId ?? "-",
      row.referenceNo ?? "-",
      row.reason ?? "-",
      row.notes ?? "-",
    ]),
  ];

  return `\uFEFF${toCsv(rows)}`;
}

export function riwayatPendudukFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `riwayat-penduduk-${slug}.csv`;
}
