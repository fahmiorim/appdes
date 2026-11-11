/**
 * Berkas pendukung jajak pendapat: ekspor CSV, normalisasi filter, dan pagination.
 */

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";

import { JAWABAN_KEPUASAN } from "./pendapat";

/** Satu baris pendapat untuk ekspor/laporan. */
export interface PendapatEksporRow {
  id: number;
  createdAt: string;
  pengguna: string | null;
  pilihan: number;
  residentId: number | null;
}

/** Label jawaban kepuasan (1..4). */
export function labelPilihan(pilihan: number): string {
  return JAWABAN_KEPUASAN.find((j) => j.value === pilihan)?.label ?? String(pilihan);
}

/** CSV daftar pendapat (mengikuti filter yang sedang aktif). */
export function buildPendapatCsv(input: {
  namaDesa: string | null;
  rows: readonly PendapatEksporRow[];
}): string {
  const header = ["No", "Tanggal", "Pengguna", "NIK/ID Warga", "Jawaban"];

  const data = input.rows.map((row, index) => [
    String(index + 1),
    row.createdAt,
    row.pengguna ?? "-",
    row.residentId === null ? "-" : String(row.residentId),
    labelPilihan(row.pilihan),
  ]);

  return `\uFEFF${toCsv([
    ["Jajak Pendapat Kepuasan Pelayanan Desa"],
    [input.namaDesa ?? "-"],
    [],
    header,
    ...data,
  ])}`;
}

export function pendapatFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `jajak-pendapat-${slug}.csv`;
}

/** Normalisasi parameter pagination/filter dari query string. */
export function normalisasiHalaman(value: string | null | undefined): number {
  const angka = Number(value);
  return Number.isInteger(angka) && angka > 0 ? angka : 1;
}

export function normalisasiBatas(value: string | null | undefined, defaultLimit = 20): number {
  const angka = Number(value);
  if (!Number.isInteger(angka) || angka <= 0) return defaultLimit;
  return Math.min(100, angka);
}
