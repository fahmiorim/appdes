/**
 * Arsip nomor surat: aturan halaman dan format ekspor CSV.
 *
 * Fungsi di sini murni agar pagination/ekspor dapat diuji tanpa basis data.
 */

import { selCsv } from "@/lib/spreadsheet";

export const ARSIP_PER_HALAMAN = 25;
/** Batas aman ekspor sekali unduh. */
export const ARSIP_MAKS_EKSPOR = 5000;

export interface ArsipNomorEksporRow {
  number: string;
  typeName: string;
  sequence: number;
  year: number;
  issuedAt: Date;
}

/** Halaman dari query string; nilai tidak sah jatuh ke halaman 1. */
export function normalisasiHalaman(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const nilai = Number(raw);
  return Number.isInteger(nilai) && nilai > 0 ? nilai : 1;
}

/** Jumlah halaman; minimal 1 agar UI tidak menampilkan "0 halaman". */
export function totalHalaman(total: number, perHalaman = ARSIP_PER_HALAMAN): number {
  if (total <= 0) return 1;
  return Math.ceil(total / perHalaman);
}

function slugDesa(namaDesa: string | null): string {
  return (
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa"
  );
}

export function namaBerkasArsipNomor(namaDesa: string | null): string {
  return `arsip-nomor-surat-${slugDesa(namaDesa)}.csv`;
}

/** CSV arsip nomor surat (BOM agar Excel membaca UTF-8). */
export function buildArsipNomorCsv(input: {
  namaDesa: string | null;
  rows: readonly ArsipNomorEksporRow[];
  filter?: string | null;
}): string {
  const header = ["No", "Nomor Surat", "Jenis Surat", "Nomor Urut", "Tahun", "Tanggal Terbit"];
  const data = input.rows.map((row, index) => [
    String(index + 1),
    row.number,
    row.typeName,
    String(row.sequence),
    String(row.year),
    row.issuedAt.toISOString().slice(0, 10),
  ]);

  const meta = [
    ["Arsip Nomor Surat"],
    [input.namaDesa ?? "-"],
    [input.filter && input.filter.trim() !== "" ? `Filter: ${input.filter}` : "Tanpa filter"],
    [],
  ];

  return `\uFEFF${[...meta, header, ...data].map((baris) => baris.map((sel) => selCsv(sel)).join(",")).join("\r\n")}\r\n`;
}
