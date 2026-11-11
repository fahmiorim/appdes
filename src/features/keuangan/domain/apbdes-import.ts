import ExcelJS from "exceljs";
import { z } from "zod";

import { bacaTabelImpor } from "@/lib/spreadsheet";

import { kodeLength, parentKode } from "./keuangan";

/** Kolom template APBDes (Excel/CSV). */
export const APBDES_TEMPLATE_COLUMNS = [
  "kode_rekening",
  "nama",
  "pagu",
  "bidang",
  "kelompok",
  "subkelompok",
  "akun",
  "sumber_dana",
  "level",
  "parent_kode",
] as const;

/** Tipe data baris template. */
export interface ApbdesTemplateRow {
  kode_rekening: string;
  nama: string;
  pagu: string;
  bidang: string;
  kelompok: string;
  subkelompok: string;
  akun: string;
  sumber_dana: string;
  level: number;
  parent_kode: string | null;
}

/** Hasil validasi baris. */
export interface ApbdesValidationResult {
  valid: boolean;
  row: ApbdesTemplateRow;
  errors: string[];
}

/** Hasil impor. */
export interface ApbdesImportResult {
  success: number;
  errors: Array<{
    row: number;
    kode_rekening: string;
    errors: string[];
  }>;
}

/** Skema validasi baris template. */
export const apbdesTemplateRowSchema = z.object({
  kode_rekening: z.string().trim().min(1, "Kode rekening wajib diisi"),
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  pagu: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
      "Pagu harus angka desimal (maks 2 digit)",
    ),
  bidang: z.string().trim().optional(),
  kelompok: z.string().trim().optional(),
  subkelompok: z.string().trim().optional(),
  akun: z.string().trim().optional(),
  sumber_dana: z.string().trim().optional(),
  level: z.coerce.number().int().min(1).max(5),
  parent_kode: z.string().trim().optional().nullable(),
});

/** Konversi string pagu ke format desimal 2 digit (string). */
export function normalizePagu(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "0.00";
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return "0.00";
  return num.toFixed(2);
}

/** Validasi konsistensi level vs kode_rekening. */
/** Peta level hierarki (1-5) ke panjang string kode yang diharapkan. */
const LEVEL_TO_CODE_LENGTH: Record<number, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
  5: 11,
};

function validateLevelKode(row: ApbdesTemplateRow): string[] {
  const errors: string[] = [];
  const expectedLength = LEVEL_TO_CODE_LENGTH[row.level];
  if (expectedLength === undefined) {
    errors.push(`Level tidak valid: ${row.level} (harus 1-5)`);
  } else {
    const actualLength = kodeLength(row.kode_rekening);
    if (actualLength !== expectedLength) {
      errors.push(
        `Level tidak konsisten dengan kode_rekening: kode="${row.kode_rekening}" length seharusnya ${expectedLength}, ditemukan ${actualLength}`,
      );
    }
  }
  return errors;
}

/** Validasi parent_kode vs kode_rekening. */
function validateParentKode(row: ApbdesTemplateRow): string[] {
  const errors: string[] = [];
  const expectedParent = parentKode(row.kode_rekening);
  const providedParent = row.parent_kode?.trim() || null;

  if (expectedParent === null) {
    if (providedParent !== null && providedParent !== "") {
      errors.push(`Kode level 1 (${row.kode_rekening}) tidak boleh memiliki parent_kode`);
    }
  } else {
    if (providedParent !== expectedParent) {
      errors.push(
        `parent_kode tidak sesuai: diharapkan "${expectedParent}", ditemukan "${providedParent ?? "kosong"}"`,
      );
    }
  }
  return errors;
}

/** Validasi pagu >= 0. */
function validatePagu(row: ApbdesTemplateRow): string[] {
  const errors: string[] = [];
  const paguNum = Number(row.pagu);
  if (paguNum < 0) {
    errors.push("Pagu tidak boleh negatif");
  }
  return errors;
}

/** Validasi satu baris template. */
export function validateApbdesRow(
  row: ApbdesTemplateRow,
  existingKodes: Set<string>,
  allRows: ApbdesTemplateRow[],
): ApbdesValidationResult {
  const errors: string[] = [];

  // Validasi skema dasar
  const parseResult = apbdesTemplateRowSchema.safeParse(row);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return { valid: false, row, errors };
  }

  // Validasi kode unik dalam file
  if (existingKodes.has(row.kode_rekening.trim())) {
    errors.push(`Kode rekening duplikat dalam file: ${row.kode_rekening}`);
  }

  // Validasi level konsisten
  errors.push(...validateLevelKode(row));

  // Validasi parent_kode
  errors.push(...validateParentKode(row));

  // Validasi pagu
  errors.push(...validatePagu(row));

  // Validasi parent exists dalam file (kecuali level 1)
  if (row.level > 1) {
    const parentExists = allRows.some((r) => r.kode_rekening.trim() === row.parent_kode?.trim());
    if (!parentExists) {
      errors.push(`Parent kode tidak ditemukan dalam file: ${row.parent_kode}`);
    }
  }

  return {
    valid: errors.length === 0,
    row,
    errors,
  };
}

/** Validasi semua baris. */
export function validateApbdesRows(rows: ApbdesTemplateRow[]): {
  validRows: ApbdesTemplateRow[];
  results: ApbdesValidationResult[];
} {
  const seenKodes = new Set<string>();
  const results: ApbdesValidationResult[] = [];
  const validRows: ApbdesTemplateRow[] = [];

  for (const row of rows) {
    const result = validateApbdesRow(row, seenKodes, rows);
    results.push(result);
    if (result.valid) {
      seenKodes.add(row.kode_rekening.trim());
      validRows.push(row);
    }
  }

  return { validRows, results };
}

/** Parse file Excel/CSV ke baris template menggunakan helper internal SID. */
export async function parseApbdesFile(
  buffer: Buffer,
  filename: string,
): Promise<ApbdesTemplateRow[]> {
  const tabel = await bacaTabelImpor(buffer, filename);
  if (tabel.length <= 1) return [];

  const headers = (tabel[0] ?? []).map((h) => h.trim().toLowerCase());
  const rows = tabel.slice(1);

  // Map header index
  const colIndex = (colName: string) => {
    const index = headers.indexOf(colName);
    if (index === -1) {
      console.warn(`Column '${colName}' not found in file headers.`);
    }
    return index;
  };

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => ({
      kode_rekening: (row[colIndex("kode_rekening")] ?? "").trim(),
      nama: (row[colIndex("nama")] ?? "").trim(),
      pagu: (row[colIndex("pagu")] ?? "").trim(),
      bidang: (colIndex("bidang") !== -1 ? row[colIndex("bidang")] : "") ?? "",
      kelompok: (colIndex("kelompok") !== -1 ? row[colIndex("kelompok")] : "") ?? "",
      subkelompok: (colIndex("subkelompok") !== -1 ? row[colIndex("subkelompok")] : "") ?? "",
      akun: (colIndex("akun") !== -1 ? row[colIndex("akun")] : "") ?? "",
      sumber_dana: (colIndex("sumber_dana") !== -1 ? row[colIndex("sumber_dana")] : "") ?? "",
      level: Number((row[colIndex("level")] ?? "1").trim()) || 1,
      parent_kode:
        (colIndex("parent_kode") !== -1 ? row[colIndex("parent_kode")] : "")?.trim() || null,
    }));
}

/** Generate template Excel buffer menggunakan ExcelJS. */
export async function generateApbdesTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Template APBDes");

  // Columns definition
  worksheet.columns = [
    { header: "kode_rekening", key: "kode_rekening", width: 20 },
    { header: "nama", key: "nama", width: 50 },
    { header: "pagu", key: "pagu", width: 18 },
    { header: "bidang", key: "bidang", width: 20 },
    { header: "kelompok", key: "kelompok", width: 20 },
    { header: "subkelompok", key: "subkelompok", width: 20 },
    { header: "akun", key: "akun", width: 20 },
    { header: "sumber_dana", key: "sumber_dana", width: 15 },
    { header: "level", key: "level", width: 8 },
    { header: "parent_kode", key: "parent_kode", width: 15 },
  ];

  // Sample data per level
  const sampleData: ApbdesTemplateRow[] = [
    {
      kode_rekening: "4",
      nama: "PENDAPATAN",
      pagu: "0",
      bidang: "",
      kelompok: "",
      subkelompok: "",
      akun: "4",
      sumber_dana: "",
      level: 1,
      parent_kode: null,
    },
    {
      kode_rekening: "5",
      nama: "BELANJA",
      pagu: "0",
      bidang: "",
      kelompok: "",
      subkelompok: "",
      akun: "5",
      sumber_dana: "",
      level: 1,
      parent_kode: null,
    },
    {
      kode_rekening: "6",
      nama: "PEMBIAYAAN",
      pagu: "0",
      bidang: "",
      kelompok: "",
      subkelompok: "",
      akun: "6",
      sumber_dana: "",
      level: 1,
      parent_kode: null,
    },
    {
      kode_rekening: "4.1",
      nama: "PENDAPATAN ASLI DESA",
      pagu: "0",
      bidang: "Pendapatan",
      kelompok: "4.1",
      subkelompok: "",
      akun: "4",
      sumber_dana: "",
      level: 2,
      parent_kode: "4",
    },
    {
      kode_rekening: "5.1",
      nama: "BELANJA BIDANG PENYELENGGARAAN PEMERINTAHAN DESA",
      pagu: "0",
      bidang: "Pemerintahan",
      kelompok: "5.1",
      subkelompok: "",
      akun: "5",
      sumber_dana: "",
      level: 2,
      parent_kode: "5",
    },
    {
      kode_rekening: "4.1.1",
      nama: "HASIL USAHA",
      pagu: "0",
      bidang: "Pendapatan",
      kelompok: "4.1",
      subkelompok: "4.1.1",
      akun: "4",
      sumber_dana: "",
      level: 3,
      parent_kode: "4.1",
    },
    {
      kode_rekening: "5.1.1",
      nama: "PENGHASILAN TETAP DAN TUNJANGAN",
      pagu: "0",
      bidang: "Pemerintahan",
      kelompok: "5.1",
      subkelompok: "5.1.1",
      akun: "5",
      sumber_dana: "",
      level: 3,
      parent_kode: "5.1",
    },
    {
      kode_rekening: "4.1.1.01",
      nama: "Hasil BUMDes",
      pagu: "50000000",
      bidang: "Pendapatan",
      kelompok: "4.1",
      subkelompok: "4.1.1",
      akun: "4",
      sumber_dana: "PAD",
      level: 4,
      parent_kode: "4.1.1",
    },
    {
      kode_rekening: "5.1.1.01",
      nama: "Penghasilan Tetap Kepala Desa & Perangkat",
      pagu: "200000000",
      bidang: "Pemerintahan",
      kelompok: "5.1",
      subkelompok: "5.1.1",
      akun: "5",
      sumber_dana: "DD",
      level: 4,
      parent_kode: "5.1.1",
    },
    {
      kode_rekening: "5.1.1.01.01",
      nama: "Gaji Pokok Kepala Desa",
      pagu: "120000000",
      bidang: "Pemerintahan",
      kelompok: "5.1",
      subkelompok: "5.1.1",
      akun: "5",
      sumber_dana: "DD",
      level: 5,
      parent_kode: "5.1.1.01",
    },
  ];

  for (const row of sampleData) {
    worksheet.addRow({ ...row, parent_kode: row.parent_kode ?? "" });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Transform baris template valid ke format upsert database. */
export function transformToUpsert(
  rows: ApbdesTemplateRow[],
  villageId: number,
  tahun: number,
  createdBy: string,
): Array<{
  villageId: number;
  templateUuid: string;
  tahun: number;
  anggaran: string;
  realisasi: string;
  createdBy: string;
}> {
  return rows.map((row) => ({
    villageId,
    templateUuid: row.kode_rekening.trim(),
    tahun,
    anggaran: normalizePagu(row.pagu),
    realisasi: "0.00",
    createdBy,
  }));
}
