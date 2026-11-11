import { toCsv } from "./laporan-csv";
import type { TriwulanBaris, TriwulanTotal } from "./laporan-triwulan";

/**
 * Ekspor laporan realisasi triwulan ke CSV (konvensi sama dengan
 * `laporan-csv.ts`: separator `;`, BOM UTF-8, angka desimal polos).
 */

export interface TriwulanCsvInput {
  namaDesa: string | null;
  kecamatan: string | null;
  tahun: number;
  baris: readonly TriwulanBaris[];
  total: TriwulanTotal;
}

const HEADER = ["Kode", "Bidang", "Anggaran", "TW I", "TW II", "TW III", "TW IV", "Realisasi", "%"];

function barisKeSel(row: TriwulanBaris): string[] {
  return [
    row.kode,
    row.uraian,
    row.anggaran,
    row.tw1,
    row.tw2,
    row.tw3,
    row.tw4,
    row.realisasi,
    row.persen.toFixed(2),
  ];
}

/** Teks CSV laporan realisasi per bidang per triwulan. */
export function buildTriwulanCsv(input: TriwulanCsvInput): string {
  const rows: string[][] = [
    ["Laporan Realisasi APBDes Per Triwulan"],
    [
      "Desa",
      input.namaDesa ?? "-",
      "Kecamatan",
      input.kecamatan ?? "-",
      "Tahun Anggaran",
      String(input.tahun),
    ],
    [],
    HEADER,
    ...input.baris.map(barisKeSel),
    [
      "",
      "Jumlah",
      input.total.anggaran,
      input.total.tw1,
      input.total.tw2,
      input.total.tw3,
      input.total.tw4,
      input.total.realisasi,
      input.total.persen.toFixed(2),
    ],
  ];

  return `\uFEFF${toCsv(rows)}`;
}

/** Nama berkas aman untuk unduhan, mis. `triwulan-apbdes-sukamaju-2026.csv`. */
export function triwulanCsvFilename(namaDesa: string | null, tahun: number): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `triwulan-apbdes-${slug}-${tahun}.csv`;
}
