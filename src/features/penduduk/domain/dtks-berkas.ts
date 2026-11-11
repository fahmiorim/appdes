/**
 * Berkas pendukung DTKS: definisi kolom impor, ekspor CSV, dan rekapitulasi.
 *
 * Dipisahkan dari `dtks.ts` agar aturan berkas (yang murni dan mudah diuji)
 * tidak bercampur dengan bentuk data formulir.
 */

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";
import type { KolomImpor } from "@/lib/spreadsheet";

import { DTKS_STATUS_LABELS, type DtksStatus } from "./dtks";

// --- Impor -----------------------------------------------------------------

/** Kunci kolom impor DTKS. */
export type KunciImporDtks = "noRtm" | "namaResponden" | "namaPetugas" | "tanggalPencacahan";

/**
 * Kolom yang dibaca dari berkas impor.
 *
 * Impor DTKS **tidak** membuat penduduk/RTM baru: berkas hanya menautkan nomor
 * RTM yang sudah ada ke formulir DTKS, sehingga data kependudukan tetap satu
 * sumber kebenaran.
 */
export const KOLOM_IMPOR_DTKS: readonly KolomImpor<KunciImporDtks>[] = [
  { kunci: "noRtm", label: "No. RTM", alias: ["nomor rtm", "no rtm"], wajib: true },
  { kunci: "namaResponden", label: "Nama Responden", alias: ["responden"] },
  { kunci: "namaPetugas", label: "Nama Petugas", alias: ["petugas", "pencacah"] },
  { kunci: "tanggalPencacahan", label: "Tanggal Pencacahan", alias: ["tanggal"] },
];

/** Satu baris impor DTKS yang sudah tervalidasi bentuknya. */
export interface BarisImporDtks {
  noRtm: string;
  namaResponden: string;
  namaPetugas: string;
  tanggalPencacahan: string;
}

/**
 * Rencana impor DTKS: baris yang siap diproses beserta alasan baris lain
 * dilewati.
 *
 * Pencocokan nomor RTM dan penyaringan baris ganda dikerjakan di domain agar
 * aturannya dapat diuji tanpa basis data; use case hanya menulis formulirnya.
 */
export interface RencanaImporDtks {
  siap: Array<{
    noRtm: string;
    rtmId: number;
    namaResponden: string;
    namaPetugas: string;
    tanggalPencacahan: string;
  }>;
  /** Nomor RTM pada berkas yang tidak ada di desa ini. */
  tidakDitemukan: string[];
  /** Nomor RTM yang muncul lebih dari sekali pada berkas. */
  ganda: string[];
}

/**
 * Susun rencana impor dari baris berkas dan peta nomor RTM → id RTM desa.
 *
 * Baris pertama untuk sebuah nomor RTM dipakai; pengulangan berikutnya
 * dilaporkan sebagai `ganda` agar impor tetap idempoten meski berkas berisi
 * nomor yang sama dua kali. Nomor RTM yang tidak dikenal tetap dilaporkan,
 * bukan menggagalkan seluruh impor.
 */
export function rencanaImporDtks(
  rows: readonly BarisImporDtks[],
  petaRtm: ReadonlyMap<string, number>,
): RencanaImporDtks {
  const rencana: RencanaImporDtks = { siap: [], tidakDitemukan: [], ganda: [] };
  const terlihat = new Set<string>();

  for (const row of rows) {
    const noRtm = row.noRtm.trim();
    if (terlihat.has(noRtm)) {
      rencana.ganda.push(noRtm);
      continue;
    }
    terlihat.add(noRtm);

    const rtmId = petaRtm.get(noRtm);
    if (!rtmId) {
      rencana.tidakDitemukan.push(noRtm);
      continue;
    }

    rencana.siap.push({
      noRtm,
      rtmId,
      namaResponden: row.namaResponden,
      namaPetugas: row.namaPetugas,
      tanggalPencacahan: row.tanggalPencacahan,
    });
  }

  return rencana;
}

// --- Ekspor -----------------------------------------------------------------

/** Satu baris data DTKS untuk ekspor/laporan. */
export interface DtksEksporRow {
  id: number;
  noRtm: string;
  kepalaRtm: string | null;
  status: DtksStatus;
  jumlahAnggota: number;
  dusun: string | null;
  namaPetugas: string | null;
  namaResponden: string | null;
  tanggalPencacahan: string | null;
  namaKk: string | null;
}

/** CSV daftar DTKS (mengikuti filter yang sedang aktif). */
export function buildDtksCsv(input: {
  namaDesa: string | null;
  rows: readonly DtksEksporRow[];
}): string {
  const header = [
    "No",
    "No. RTM",
    "Kepala Rumah Tangga",
    "No. KK",
    "Dusun",
    "Status",
    "Anggota",
    "Petugas Pencacahan",
    "Responden",
    "Tanggal Pencacahan",
  ];

  const data = input.rows.map((row, index) => [
    String(index + 1),
    row.noRtm,
    row.kepalaRtm ?? "-",
    row.namaKk ?? "-",
    row.dusun ?? "-",
    DTKS_STATUS_LABELS[row.status],
    String(row.jumlahAnggota),
    row.namaPetugas ?? "-",
    row.namaResponden ?? "-",
    row.tanggalPencacahan ?? "-",
  ]);

  return `\uFEFF${toCsv([[`Data Terpadu Kesejahteraan Sosial (DTKS)`], [input.namaDesa ?? "-"], [], header, ...data])}`;
}

export function dtksFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `dtks-${slug}.csv`;
}

// --- Rekapitulasi -----------------------------------------------------------

/** Satu baris rekapitulasi DTKS. */
export interface DtksRekapRow {
  label: string;
  jumlah: number;
  anggota: number;
  percentage: number;
}

export interface DtksRekap {
  total: number;
  totalAnggota: number;
  perStatus: DtksRekapRow[];
  perDusun: DtksRekapRow[];
}

/** Kelompokkan baris DTKS menjadi rekapitulasi (fungsi murni). */
function kelompokkan(
  rows: readonly DtksEksporRow[],
  kunci: (row: DtksEksporRow) => string,
): DtksRekapRow[] {
  const peta = new Map<string, { jumlah: number; anggota: number }>();

  for (const row of rows) {
    const label = kunci(row);
    const nilai = peta.get(label) ?? { jumlah: 0, anggota: 0 };
    nilai.jumlah += 1;
    nilai.anggota += row.jumlahAnggota;
    peta.set(label, nilai);
  }

  const total = rows.length;

  return [...peta.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "id", { numeric: true }))
    .map(([label, nilai]) => ({
      label,
      jumlah: nilai.jumlah,
      anggota: nilai.anggota,
      percentage: total === 0 ? 0 : Math.round((nilai.jumlah / total) * 10000) / 100,
    }));
}

/** Label untuk DTKS yang wilayah RTM-nya belum ditentukan. */
export const DTKS_TANPA_DUSUN = "(Belum ada dusun)";

/** Rekapitulasi DTKS menurut status dan dusun. */
export function hitungRekapDtks(rows: readonly DtksEksporRow[]): DtksRekap {
  return {
    total: rows.length,
    totalAnggota: rows.reduce((jumlah, row) => jumlah + row.jumlahAnggota, 0),
    perStatus: kelompokkan(rows, (row) => DTKS_STATUS_LABELS[row.status]),
    perDusun: kelompokkan(rows, (row) =>
      row.dusun && row.dusun.trim() !== "" ? row.dusun.trim() : DTKS_TANPA_DUSUN,
    ),
  };
}

/** CSV rekapitulasi DTKS (blok status + blok dusun). */
export function buildDtksRekapCsv(input: { namaDesa: string | null; rekap: DtksRekap }): string {
  const baris: string[][] = [
    ["Rekapitulasi DTKS"],
    [input.namaDesa ?? "-"],
    [],
    ["Formulir DTKS", String(input.rekap.total)],
    ["Anggota tercatat", String(input.rekap.totalAnggota)],
    [],
    ["Menurut Status"],
    ["Status", "Jumlah DTKS", "Jumlah Anggota", "Persentase"],
  ];

  const tambah = (rows: readonly DtksRekapRow[]) => {
    for (const row of rows) {
      baris.push([row.label, String(row.jumlah), String(row.anggota), `${row.percentage}%`]);
    }
  };

  tambah(input.rekap.perStatus);
  baris.push([], ["Menurut Dusun"], ["Dusun", "Jumlah DTKS", "Jumlah Anggota", "Persentase"]);
  tambah(input.rekap.perDusun);

  return `\uFEFF${toCsv(baris)}`;
}

export function dtksRekapFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `rekap-dtks-${slug}.csv`;
}

/** Template CSV impor DTKS (header + satu baris contoh). */
export function templateImporDtks(): string {
  return `\uFEFFNo. RTM,Nama Responden,Nama Petugas,Tanggal Pencacahan\r\n32010100001,Ani,Petugas Desa,2026-01-15\r\n`;
}
