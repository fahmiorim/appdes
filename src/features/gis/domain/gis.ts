import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Slug resource RBAC untuk kategori polygon peta. */
export const POLYGON_RESOURCE = RESOURCES.gisPolygon;
/** Slug resource RBAC untuk area peta. */
export const AREA_RESOURCE = RESOURCES.gisArea;
/** Slug resource RBAC untuk garis peta. */
export const GARIS_RESOURCE = RESOURCES.gisGaris;
/** Slug resource RBAC untuk titik peta. */
export const POINT_RESOURCE = RESOURCES.gisPoint;
/** Slug resource RBAC untuk simbol peta. */
export const SIMBOL_RESOURCE = RESOURCES.gisSimbol;
/** Slug resource RBAC untuk pertanahan. */
export const PERTANAHAN_RESOURCE = RESOURCES.pertanahan;

// --- Polygon ----------------------------------------------------------------

/** Tipe polygon: 0 = root/layer utama, 1 = sub-polygon detail. */
export const POLYGON_TIPE = [0, 1] as const;
export type PolygonTipe = (typeof POLYGON_TIPE)[number];

export const POLYGON_TIPE_LABELS: Readonly<Record<PolygonTipe, string>> = {
  0: "Root / Layer Utama",
  1: "Sub-Polygon",
};

export function polygonTipeLabel(tipe: number | null): string {
  if (tipe === 0) return POLYGON_TIPE_LABELS[0];
  if (tipe === 1) return POLYGON_TIPE_LABELS[1];
  return tipe !== null ? `Tipe ${tipe}` : "-";
}

export const polygonFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama polygon wajib diisi.").max(50),
  simbol: z.string().trim().optional().nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus berupa kode HEX 6 digit (contoh: #FF5733).")
    .optional()
    .nullable(),
  tipe: z.coerce
    .number()
    .int("Tipe harus bilangan bulat.")
    .min(0, "Tipe minimal 0.")
    .max(1, "Tipe maksimal 1.")
    .default(0),
  parrent: z.coerce.number().int().positive().nullish().default(null),
  enabled: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type PolygonFormInput = z.infer<typeof polygonFormSchema>;

export interface PolygonDTO {
  id: number;
  villageId: number;
  nama: string;
  simbol: string | null;
  color: string | null;
  tipe: number;
  parrent: number | null;
  enabled: number;
  sortOrder: number;
}

// --- Area -------------------------------------------------------------------

export const areaFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama area wajib diisi.").max(50),
  refPolygon: z.coerce.number().int().positive().nullish(),
  path: z.string().trim().optional().nullable(),
  foto: z.string().trim().optional().nullable(),
  desk: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type AreaFormInput = z.infer<typeof areaFormSchema>;

export interface AreaDTO {
  id: number;
  villageId: number;
  refPolygon: number | null;
  nama: string;
  path: string | null;
  foto: string | null;
  desk: string | null;
  enabled: number;
  sortOrder: number;
}

// --- Garis ------------------------------------------------------------------

export const garisFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama garis wajib diisi.").max(50),
  refLine: z.coerce.number().int().positive().nullish(),
  path: z.string().trim().optional().nullable(),
  foto: z.string().trim().optional().nullable(),
  desk: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type GarisFormInput = z.infer<typeof garisFormSchema>;

export interface GarisDTO {
  id: number;
  villageId: number;
  refLine: number | null;
  nama: string;
  path: string | null;
  foto: string | null;
  desk: string | null;
  enabled: number;
  sortOrder: number;
}

// --- Point ------------------------------------------------------------------

export const pointFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama titik wajib diisi.").max(50),
  simbol: z.string().trim().optional().nullable(),
  tipe: z.coerce.number().int().nullish().default(0),
  parrent: z.coerce.number().int().positive().nullish().default(null),
  path: z.string().trim().optional().nullable(),
});

export type PointFormInput = z.infer<typeof pointFormSchema>;

export interface PointDTO {
  id: number;
  villageId: number;
  nama: string;
  simbol: string | null;
  tipe: number | null;
  parrent: number | null;
  path: string | null;
  enabled: number;
  sortOrder: number;
}

// --- Simbol -----------------------------------------------------------------

export const simbolFormSchema = z.object({
  simbol: z.string().trim().min(1, "Nama simbol wajib diisi.").max(40),
  desk: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type SimbolFormInput = z.infer<typeof simbolFormSchema>;

export interface SimbolDTO {
  id: number;
  simbol: string;
  desk: string | null;
  sortOrder: number;
}

// --- Persil -----------------------------------------------------------------

export const persilFormSchema = z.object({
  nomor: z.string().trim().min(1, "No. Persil wajib diisi.").max(50),
  nomorCdesa: z.string().trim().optional().nullable(),
  luas: z.coerce.number().finite().min(0).default(0),
  status: z.string().trim().max(30).optional().nullable(),
  path: z.string().trim().optional().nullable(),
  keterangan: z.string().trim().optional().nullable(),
});

export type PersilFormInput = z.infer<typeof persilFormSchema>;

export interface PersilDTO {
  id: number;
  villageId: number;
  nomor: string;
  nomorCdesa: string | null;
  luas: number;
  status: string | null;
  path: string | null;
  keterangan: string | null;
  sortOrder: number;
}

export const cdesaSchema = z.object({
  nomor: z.string().trim().min(1, "Nomor Cdesa wajib diisi.").max(50),
  nomorPersil: z.string().trim().max(50).optional().nullable(),
  nomorSertifikat: z.string().trim().max(50).optional().nullable(),
  tanggal: z.string().trim().optional().nullable(),
  namaPemegang: z.string().trim().max(255).optional().nullable(),
  luas: z.coerce.number().finite().min(0).default(0),
  keterangan: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const cdesaMutasiSchema = z.object({
  cdesaId: z.coerce.number().int().positive(),
  nomor: z.string().trim().min(1, "Nomor mutasi wajib diisi.").max(50),
  tanggal: z.string().trim().min(1, "Tanggal mutasi wajib diisi."),
  tipe: z.string().trim().min(1, "Jenis mutasi wajib diisi.").max(30),
  keterangan: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export interface CdesaDTO {
  id: number;
  villageId: number;
  nomor: string;
  nomorPersil: string | null;
  nomorSertifikat: string | null;
  tanggal: string | null;
  namaPemegang: string | null;
  luas: number;
  keterangan: string | null;
  sortOrder: number;
}

export interface CdesaRincianDTO {
  id: number;
  cdesaId: number;
  nama: string | null;
  alamat: string | null;
  dllb: string | null;
  sortOrder: number;
}

export interface CdesaMutasiDTO {
  id: number;
  villageId: number;
  cdesaId: number;
  nomor: string;
  tanggal: string;
  tipe: string;
  keterangan: string | null;
  sortOrder: number;
}

/** Input insert `cdesa_mutasi`; `id` di-generate oleh basis data. */
export interface CdesaMutasiInput {
  villageId: number;
  cdesaId: number;
  nomor: string;
  tanggal: string;
  tipe: string;
  keterangan?: string | null;
  sortOrder: number;
}

// --- Helpers ----------------------------------------------------------------

/** Filter polygon aktif per desa, diurutkan berdasarkan sortOrder. */
export function isPolygonActive(p: Pick<PolygonDTO, "enabled">): boolean {
  return p.enabled === 1;
}

/** Konversi path GeoJSON → array of [lon, lat] pairs (LineString). */
export function parseGeoJsonPath(path: string): [number, number][] | null {
  try {
    const parsed = JSON.parse(path);
    if (parsed?.type === "LineString" && Array.isArray(parsed.coordinates)) {
      return parsed.coordinates as [number, number][];
    }
  } catch {
    // ignore
  }
  return null;
}
