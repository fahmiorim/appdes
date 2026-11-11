import { z } from "zod";

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";
import { RESOURCES } from "@/features/rbac/domain/resources";

/** Slug resource RBAC untuk modul DPT. */
export const DPT_RESOURCE = RESOURCES.penduduk;

/** Skema input CRUD pemilihan (dipakai admin). */
export const electionFormSchema = z.object({
  judul: z.string().trim().min(1, "Judul wajib diisi.").max(200, "Maksimal 200 karakter."),
  status: z.enum(["draf", "aktif", "selesai"], {
    error: "Status tidak valid.",
  }),
  tanggal: z.iso.date("Tanggal pemilihan tidak valid."),
  keterangan: z.string().trim().max(1000).optional(),
});

export type ElectionFormInput = z.infer<typeof electionFormSchema>;

/** Bentuk data pemilihan untuk UI. */
export interface ElectionDTO {
  id: number;
  villageId: number;
  judul: string;
  status: "draf" | "aktif" | "selesai";
  tanggal: string;
  keterangan: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Skema filter daftar DPT. */
export const listDptParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
  rw: z.string().trim().optional(),
  rt: z.string().trim().optional(),
  gender: z.enum(["male", "female"]).optional(),
  agamaId: z.coerce.number().int().positive().optional(),
  pendidikanId: z.coerce.number().int().positive().optional(),
  pekerjaanId: z.coerce.number().int().positive().optional(),
  statusKawinId: z.coerce.number().int().positive().optional(),
  umurMin: z.coerce.number().int().min(0).optional(),
  umurMax: z.coerce.number().int().min(0).optional(),
});

export type ListDptParams = z.infer<typeof listDptParamsSchema>;

/** Filter DPT tanpa pagination (dipakai rekapitulasi & ekspor). */
export const dptFilterSchema = listDptParamsSchema.omit({ page: true, perPage: true });

export type DptFilter = z.infer<typeof dptFilterSchema>;

export const DEFAULT_DPT_PAGE = 1;
export const DEFAULT_DPT_PER_PAGE = 20;
export const MAX_DPT_PER_PAGE = 100;

/** Baris DPT untuk tabel/admin. */
export interface DptRow {
  id: number;
  nationalId: string | null;
  name: string;
  gender: "male" | "female";
  birthDate: string | null;
  dusun: string | null;
  rw: string | null;
  rt: string | null;
  agama: string | null;
  pendidikan: string | null;
  pekerjaan: string | null;
  statusKawin: string | null;
  umurPemilihan: number | null;
}

/** Hasil paginasi DPT. */
export interface ListDptResult {
  rows: DptRow[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

/**
 * Baris DPT untuk halaman publik.
 *
 * Halaman publik hanya butuh informasi untuk memastikan namanya terdaftar;
 * NIK, tanggal lahir, dan atribut pribadi lain tidak ikut dikirim ke browser.
 * Tipe terpisah membuat kebocoran NIK menjadi kesalahan tipe, bukan sekadar
 * kelalaian tampilan.
 */
export type DptPublikRow = Pick<
  DptRow,
  "id" | "name" | "gender" | "umurPemilihan" | "dusun" | "rw" | "rt"
>;

/** Hasil paginasi DPT publik. */
export interface ListDptPublikResult {
  rows: DptPublikRow[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

/** Susun baris DPT publik: buang seluruh kolom pribadi sebelum dikirim ke UI. */
export function keDptPublik(row: DptRow): DptPublikRow {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    umurPemilihan: row.umurPemilihan,
    dusun: row.dusun,
    rw: row.rw,
    rt: row.rt,
  };
}

/** CSV DPT: header + baris data. */
export function buildDptCsv(input: {
  namaDesa: string | null;
  judulPemilihan: string;
  tanggalPemilihan: string;
  rows: DptRow[];
}): string {
  const header = [
    ["Daftar Pemilih Tetap"],
    [input.namaDesa ?? "-"],
    [input.judulPemilihan],
    [`Tanggal Pemilihan: ${input.tanggalPemilihan}`],
    [],
    [
      "No",
      "NIK",
      "Nama",
      "Jenis Kelamin",
      "Tanggal Lahir",
      "Umur",
      "Dusun",
      "RW",
      "RT",
      "Agama",
      "Pendidikan",
      "Pekerjaan",
      "Status Kawin",
    ],
  ] as const; // readonly tuple of readonly string arrays

  const rowsArray = input.rows.map((r, i) => [
    String(i + 1),
    r.nationalId ?? "-",
    r.name,
    r.gender === "male" ? "Laki-laki" : "Perempuan",
    r.birthDate ?? "-",
    r.umurPemilihan?.toString() ?? "-",
    r.dusun ?? "-",
    r.rw ?? "-",
    r.rt ?? "-",
    r.agama ?? "-",
    r.pendidikan ?? "-",
    r.pekerjaan ?? "-",
    r.statusKawin ?? "-",
  ]); // string[]

  const all = [...header, ...rowsArray] as readonly (readonly string[])[];

  return `\uFEFF${toCsv(all)}`;
}

// --- Rekapitulasi DPT ------------------------------------------------------

/** Satu baris rekapitulasi pemilih (per wilayah). */
export interface DptRekapRow {
  label: string;
  total: number;
  male: number;
  female: number;
  percentage: number;
}

export interface DptRekap {
  rows: DptRekapRow[];
  total: number;
  male: number;
  female: number;
}

/** Label wilayah untuk pemilih yang belum punya dusun. */
export const DPT_TANPA_DUSUN = "(Belum ada dusun)";

/**
 * Hitung rekapitulasi pemilih per dusun, termasuk jenis kelamin dan persentase.
 *
 * Fungsi murni: menerima baris ringkas (dusun + jenis kelamin) supaya aturan
 * pengelompokan dan pembulatan persentase dapat diuji tanpa basis data.
 * Dusun diurutkan menaik supaya hasil cetak stabil.
 */
export function hitungRekapDpt(
  rows: readonly { dusun: string | null; gender: "male" | "female" }[],
): DptRekap {
  const peta = new Map<string, { total: number; male: number; female: number }>();

  for (const row of rows) {
    const label = row.dusun && row.dusun.trim() !== "" ? row.dusun.trim() : DPT_TANPA_DUSUN;
    const kelompok = peta.get(label) ?? { total: 0, male: 0, female: 0 };
    kelompok.total += 1;
    if (row.gender === "male") kelompok.male += 1;
    else kelompok.female += 1;
    peta.set(label, kelompok);
  }

  const total = rows.length;
  const male = rows.filter((row) => row.gender === "male").length;
  const female = total - male;

  const baris: DptRekapRow[] = [...peta.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "id"))
    .map(([label, nilai]) => ({
      label,
      total: nilai.total,
      male: nilai.male,
      female: nilai.female,
      percentage: total === 0 ? 0 : Math.round((nilai.total / total) * 10000) / 100,
    }));

  return { rows: baris, total, male, female };
}

/** CSV rekapitulasi DPT (satu baris per wilayah + baris jumlah). */
export function buildDptRekapCsv(input: {
  namaDesa: string | null;
  judulPemilihan: string;
  tanggalPemilihan: string;
  rekap: DptRekap;
}): string {
  const header = [
    ["Rekapitulasi Daftar Pemilih Tetap"],
    [input.namaDesa ?? "-"],
    [input.judulPemilihan],
    [`Tanggal Pemilihan: ${input.tanggalPemilihan}`],
    [],
    ["No", "Wilayah", "Laki-laki", "Perempuan", "Jumlah", "Persentase"],
  ] as const;

  const data = input.rekap.rows.map((row, index) => [
    String(index + 1),
    row.label,
    String(row.male),
    String(row.female),
    String(row.total),
    `${row.percentage}%`,
  ]);

  const jumlah = [
    "",
    "JUMLAH",
    String(input.rekap.male),
    String(input.rekap.female),
    String(input.rekap.total),
    input.rekap.total === 0 ? "0%" : "100%",
  ];

  return `\uFEFF${toCsv([...header, ...data, jumlah])}`;
}

export function dptRekapFilename(namaDesa: string | null, judulPemilihan: string): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  const slugPemilu = judulPemilihan
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `rekap-dpt-${slug}${slugPemilu ? `-${slugPemilu}` : ""}.csv`;
}

export function dptFilename(namaDesa: string | null, judulPemilihan: string): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  const slugPemilu = judulPemilihan
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `dpt-${slug}-${slugPemilu}.csv`;
}
