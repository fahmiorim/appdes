/**
 * Berkas pendukung direktori kontak: kolom impor, ekspor CSV, dan rekapitulasi.
 *
 * Dipisahkan dari `kontak.ts` agar aturan berkas (murni dan mudah diuji) tidak
 * bercampur dengan bentuk data formulir.
 */

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";
import type { KolomImpor } from "@/lib/spreadsheet";

/** Satu baris kontak untuk ekspor/laporan. */
export interface KontakEksporRow {
  id: number;
  nama: string;
  telepon: string | null;
  email: string | null;
  telegram: string | null;
  hubungWarga: string | null;
  keterangan: string | null;
  residentId: number | null;
}

/** Satu baris anggota grup kontak untuk ekspor/laporan. */
export interface AnggotaGrupEksporRow {
  id: number;
  namaKontak: string;
  peran: string | null;
  keterangan: string | null;
}

// --- Impor ------------------------------------------------------------------

/** Kunci kolom impor kontak. */
export type KunciImporKontak =
  "nama" | "telepon" | "email" | "telegram" | "hubungWarga" | "keterangan" | "residentId";

/**
 * Kolom yang dibaca dari berkas impor.
 *
 * Impor kontak mendukung opsi penautan ke penduduk via `residentId` (NIK) atau
 * `nama` (fuzzy match). Kolom lain disimpan langsung.
 */
export const KOLOM_IMPOR_KONTAK: readonly KolomImpor<KunciImporKontak>[] = [
  { kunci: "nama", label: "Nama", alias: ["name", "nama kontak"], wajib: true },
  { kunci: "telepon", label: "Telepon", alias: ["telepon", "hp", "phone"] },
  { kunci: "email", label: "Email", alias: ["email", "e-mail"] },
  { kunci: "telegram", label: "Telegram", alias: ["tg", "telegram"] },
  { kunci: "hubungWarga", label: "Hubung Warga", alias: ["hubung", "hubung warga", "wa"] },
  { kunci: "keterangan", label: "Keterangan", alias: ["keterangan", "catatan"] },
  { kunci: "residentId", label: "NIK / ID Penduduk", alias: ["nik", "resident id", "id penduduk"] },
];

/** Satu baris impor kontak yang sudah tervalidasi bentuknya. */
export interface BarisImporKontak {
  nama: string;
  telepon: string;
  email: string;
  telegram: string;
  hubungWarga: string;
  keterangan: string;
  residentId: string;
}

export function templateImporKontak(): string {
  return (
    `\uFEFFNama,Telepon,Email,Telegram,Hubung Warga,Keterangan,NIK / ID Penduduk\r\n` +
    `Budi,081234567890,budi@desa.id,@budi,0812,Kontak desa,3201012001120001\r\n`
  );
}

/** CSV daftar kontak (mengikuti filter yang sedang aktif). */
export function buildKontakCsv(input: {
  namaDesa: string | null;
  rows: readonly KontakEksporRow[];
}): string {
  const header = [
    "No",
    "Nama",
    "Telepon",
    "Email",
    "Telegram",
    "Hubung Warga",
    "Keterangan",
    "NIK / ID Penduduk",
  ];

  const data = input.rows.map((row, index) => [
    String(index + 1),
    row.nama,
    row.telepon ?? "-",
    row.email ?? "-",
    row.telegram ?? "-",
    row.hubungWarga ?? "-",
    row.keterangan ?? "-",
    row.residentId === null ? "-" : String(row.residentId),
  ]);

  return `\uFEFF${toCsv([["Direktori Kontak"], [input.namaDesa ?? "-"], [], header, ...data])}`;
}

export function kontakFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `kontak-${slug}.csv`;
}

/** CSV daftar anggota sebuah grup kontak. */
export function buildGrupKontakCsv(input: {
  namaDesa: string | null;
  namaGrup: string;
  rows: readonly AnggotaGrupEksporRow[];
}): string {
  const header = ["No", "Nama Kontak", "Peran", "Keterangan"];

  const data = input.rows.map((row, index) => [
    String(index + 1),
    row.namaKontak,
    row.peran ?? "-",
    row.keterangan ?? "-",
  ]);

  return `\uFEFF${toCsv([
    ["Anggota Grup Kontak"],
    [input.namaGrup],
    [input.namaDesa ?? "-"],
    [],
    header,
    ...data,
  ])}`;
}

export function grupKontakFilename(namaGrup: string): string {
  const slug =
    namaGrup
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "grup";
  return `grup-kontak-${slug}.csv`;
}
