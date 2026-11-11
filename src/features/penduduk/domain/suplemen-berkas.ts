/**
 * Berkas pendukung data suplemen: isian dinamis, kolom impor, ekspor, rekap.
 *
 * Suplemen mengikuti perilaku OpenSID: setiap suplemen boleh punya kolom isian
 * tambahan sendiri (`data_form_isian`). Kolom itu tidak didefinisikan lebih
 * dulu — dibentuk dari pasangan nama/nilai yang diisi petugas — sehingga helper
 * di sini bekerja dengan kunci dinamis, bukan skema tetap.
 */

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";
import type { KolomImpor } from "@/lib/spreadsheet";

/** Panjang maksimum nama kolom isian dan nilai teksnya. */
export const MAKS_PANJANG_KOLOM_ISIAN = 60;
export const MAKS_PANJANG_NILAI_ISIAN = 200;
/** Batas jumlah kolom isian per suplemen agar tabel tetap terbaca. */
export const MAKS_KOLOM_ISIAN = 20;

/** Satu pasangan nama kolom → nilai isian. */
export interface IsianPasangan {
  nama: string;
  nilai: string;
}

/** Data isian satu baris terdata. */
export type IsianTerdata = Record<string, string>;

/**
 * Rapikan pasangan isian menjadi objek.
 *
 * Aturan: nama kolom dipangkas, baris tanpa nama diabaikan, nilai dipangkas,
 * dan nama yang berulang mengambil nilai yang terakhir diisi.
 */
export function normalisasiIsian(pasangan: readonly IsianPasangan[]): IsianTerdata {
  const hasil: IsianTerdata = {};

  for (const item of pasangan) {
    const nama = item.nama.trim().slice(0, MAKS_PANJANG_KOLOM_ISIAN);
    if (nama === "") continue;
    hasil[nama] = item.nilai.trim().slice(0, MAKS_PANJANG_NILAI_ISIAN);
  }

  return hasil;
}

/** Baca `data_form_isian` dari basis data (JSON, string JSON, atau kosong). */
export function bacaIsian(nilai: unknown): IsianTerdata {
  if (nilai === null || nilai === undefined) return {};

  if (typeof nilai === "string") {
    try {
      const parsed = JSON.parse(nilai) as unknown;
      return bacaIsian(parsed);
    } catch {
      return {};
    }
  }

  if (typeof nilai === "object") {
    const hasil: IsianTerdata = {};
    for (const [kunci, isi] of Object.entries(nilai as Record<string, unknown>)) {
      if (isi === null || isi === undefined) continue;
      if (typeof isi === "object") continue;
      const nama = kunci.trim();
      if (nama === "") continue;
      hasil[nama] = String(isi).slice(0, MAKS_PANJANG_NILAI_ISIAN);
    }
    return hasil;
  }

  return {};
}

/** Kumpulan nama kolom isian yang muncul di seluruh baris (urut abjad). */
export function kolomIsian(rows: readonly { isian: IsianTerdata }[]): string[] {
  const kunci = new Set<string>();
  for (const row of rows) {
    for (const nama of Object.keys(row.isian)) kunci.add(nama);
  }
  return [...kunci].sort((a, b) => a.localeCompare(b, "id")).slice(0, MAKS_KOLOM_ISIAN);
}

// --- Impor ------------------------------------------------------------------

/** Kunci kolom impor terdata suplemen. */
export type KunciImporSuplemen = "sasaran";

/**
 * Kolom tetap pada berkas impor terdata.
 *
 * Kolom di luar daftar ini diperlakukan sebagai isian dinamis: dengan begitu
 * template suplemen apa pun (disabilitas, penerima bantuan, dst.) — termasuk
 * kolom Keterangan — bisa diimpor tanpa mengubah kode.
 */
export const KOLOM_IMPOR_SUPLEMEN: readonly KolomImpor<KunciImporSuplemen>[] = [
  {
    kunci: "sasaran",
    label: "NIK / No. KK",
    alias: ["nik", "no. kk", "no kk", "sasaran"],
    wajib: true,
  },
];

// --- Ekspor & laporan -------------------------------------------------------

/** Satu baris terdata untuk ekspor. */
export interface SuplemenEksporRow {
  label: string;
  isian: IsianTerdata;
}

/** CSV daftar terdata sebuah suplemen (kolom isian mengikuti data). */
export function buildSuplemenCsv(input: {
  namaDesa: string | null;
  namaSuplemen: string;
  sasaranLabel: string;
  rows: readonly SuplemenEksporRow[];
}): string {
  const kolom = kolomIsian(input.rows);
  const header = ["No", "Sasaran", ...kolom];

  const data = input.rows.map((row, indeks) => [
    String(indeks + 1),
    row.label,
    ...kolom.map((nama) => row.isian[nama] ?? "-"),
  ]);

  return `\uFEFF${toCsv([
    ["Data Suplemen"],
    [input.namaSuplemen],
    [`Sasaran: ${input.sasaranLabel}`],
    [input.namaDesa ?? "-"],
    [],
    header,
    ...data,
  ])}`;
}

export function suplemenFilename(namaSuplemen: string): string {
  const slug =
    namaSuplemen
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "suplemen";
  return `suplemen-${slug}.csv`;
}

/** Rekapitulasi seluruh suplemen desa. */
export interface SuplemenRekapInput {
  id: number;
  nama: string;
  sasaran: number;
  jumlahTerdata: number;
}

export interface SuplemenRekapRow {
  nama: string;
  sasaran: string;
  jumlahTerdata: number;
  percentage: number;
}

export interface SuplemenRekap {
  totalSuplemen: number;
  totalTerdata: number;
  rows: SuplemenRekapRow[];
}

/** Hitung rekapitulasi suplemen (fungsi murni). */
export function hitungRekapSuplemen(
  rows: readonly SuplemenRekapInput[],
  labelSasaran: (sasaran: number) => string,
): SuplemenRekap {
  const totalTerdata = rows.reduce((jumlah, row) => jumlah + row.jumlahTerdata, 0);

  return {
    totalSuplemen: rows.length,
    totalTerdata,
    rows: [...rows]
      .sort((a, b) => b.jumlahTerdata - a.jumlahTerdata || a.nama.localeCompare(b.nama, "id"))
      .map((row) => ({
        nama: row.nama,
        sasaran: labelSasaran(row.sasaran),
        jumlahTerdata: row.jumlahTerdata,
        percentage:
          totalTerdata === 0 ? 0 : Math.round((row.jumlahTerdata / totalTerdata) * 10000) / 100,
      })),
  };
}

/** CSV rekapitulasi suplemen. */
export function buildSuplemenRekapCsv(input: {
  namaDesa: string | null;
  rekap: SuplemenRekap;
}): string {
  const baris: string[][] = [
    ["Rekapitulasi Data Suplemen"],
    [input.namaDesa ?? "-"],
    [],
    ["Jumlah suplemen", String(input.rekap.totalSuplemen)],
    ["Jumlah terdata", String(input.rekap.totalTerdata)],
    [],
    ["Suplemen", "Sasaran", "Terdata", "Persentase"],
  ];

  for (const row of input.rekap.rows) {
    baris.push([row.nama, row.sasaran, String(row.jumlahTerdata), `${row.percentage}%`]);
  }

  return `\uFEFF${toCsv(baris)}`;
}

export function suplemenRekapFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `rekap-suplemen-${slug}.csv`;
}
