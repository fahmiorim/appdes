import { z } from "zod";

export const STATISTIK_PENDUDUK_KINDS = [
  "gender",
  "age_group",
  "age_range",
  "rentan",
  "religion",
  "education",
  "occupation",
  "marital_status",
  "dusun",
] as const;

export type StatistikPendudukKind = (typeof STATISTIK_PENDUDUK_KINDS)[number];

export const STATISTIK_BANTUAN_KINDS = ["program", "sasaran"] as const;

export type StatistikBantuanKind = (typeof STATISTIK_BANTUAN_KINDS)[number];

export const STATISTIK_LABELS: Record<StatistikPendudukKind, string> = {
  gender: "Jenis Kelamin",
  age_group: "Kelompok Umur",
  age_range: "Rentang Umur",
  rentan: "Kelompok Rentan",
  religion: "Agama",
  education: "Pendidikan",
  occupation: "Pekerjaan",
  marital_status: "Status Kawin",
  dusun: "Dusun",
};

export const STATISTIK_BANTUAN_LABELS: Record<StatistikBantuanKind, string> = {
  program: "Program Bantuan",
  sasaran: "Sasaran Bantuan",
};

export interface StatistikPendudukRow {
  label: string;
  total: number;
  male: number;
  female: number;
  percentage: number;
}

export interface StatistikBantuanRow {
  label: string;
  total: number;
  male: number;
  female: number;
  percentage: number;
}

export interface StatistikPendudukSummary {
  total: number;
  male: number;
  female: number;
}

export interface StatistikBantuanSummary {
  total: number;
  male: number;
  female: number;
}

export interface StatistikPendudukParams {
  kind: StatistikPendudukKind;
  search?: string;
  page?: number;
  perPage?: number;
  dusun?: string;
  rw?: string;
  rt?: string;
  umurMin?: number;
  umurMax?: number;
}

export interface StatistikBantuanParams {
  kind: StatistikBantuanKind;
  programSlug?: string;
  sasaran?: number;
  dusun?: string;
  rw?: string;
  rt?: string;
  periodeMulai?: string;
  periodeAkhir?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface StatistikPendudukResult {
  rows: StatistikPendudukRow[];
  summary: StatistikPendudukSummary;
  page: number;
  perPage: number;
  pageCount: number;
}

export interface StatistikBantuanResult {
  rows: StatistikBantuanRow[];
  summary: StatistikBantuanSummary;
  page: number;
  perPage: number;
  pageCount: number;
}

export const statistikPendudukParamsSchema = z.object({
  kind: z.enum(STATISTIK_PENDUDUK_KINDS),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  perPage: z.number().int().positive().optional(),
});

export const statistikBantuanParamsSchema = z.object({
  kind: z.enum(STATISTIK_BANTUAN_KINDS),
  programSlug: z.string().optional(),
  sasaran: z.number().int().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  perPage: z.number().int().positive().optional(),
});
