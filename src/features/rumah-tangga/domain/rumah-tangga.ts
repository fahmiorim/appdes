import { z } from "zod";

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { NO_SELECTION, optionalSelectId, optionalText, type LabelOption } from "@/lib/forms";

/** Slug resource RBAC untuk modul rumah tangga (harus sama dengan `modules.slug`). */
export const RUMAH_TANGGA_RESOURCE = RESOURCES.rumahTangga;

/**
 * Rumah Tangga (RTM).
 *
 * RTM adalah unit sosial **di bawah** Kartu Keluarga: satu KK dapat memuat
 * beberapa rumah tangga (mis. satu rumah dihuni dua keluarga yang berbagi dapur).
 * Keanggotaan dinyatakan lewat `residents.rtm_id`, dan peran tiap anggota
 * disimpan pada `residents.rtm_level`.
 *
 * Berbeda dari sistem rujukan yang memakai `no_kk` sebagai nomor RTM (satu kolom
 * dua makna), di sini RTM punya **nomor sendiri** (`number`) yang dibangkitkan
 * dari kode desa + nomor urut, sehingga tidak bertabrakan dengan nomor KK.
 */

// --- Tingkat hubungan dalam rumah tangga -----------------------------------

/**
 * Tingkat hubungan anggota RTM.
 *
 * Nilai numerik dipertahankan sama seperti katalog rujukan (1 kepala, 2 anggota)
 * agar migrasi data lama tetap mudah. Disimpan sebagai angka pada baris penduduk.
 */
export const RTM_LEVELS = [1, 2] as const;
export type RtmLevel = (typeof RTM_LEVELS)[number];

export const RTM_LEVEL_KEPALA: RtmLevel = 1;
export const RTM_LEVEL_ANGGOTA: RtmLevel = 2;

export const RTM_LEVEL_LABELS: Readonly<Record<RtmLevel, string>> = {
  1: "Kepala Rumah Tangga",
  2: "Anggota",
};

/** Label tingkat hubungan, atau "-" bila belum ditentukan. */
export function rtmLevelLabel(level: number | null): string {
  if (level === 1 || level === 2) return RTM_LEVEL_LABELS[level];
  return "-";
}

/** Apakah tingkat hubungan termasuk kepala rumah tangga? */
export function isKepalaRtm(level: number | null): boolean {
  return level === RTM_LEVEL_KEPALA;
}

// --- Validasi formulir -----------------------------------------------------

/**
 * Skema validasi input rumah tangga.
 *
 * Nomor RTM **tidak** diminta dari pengguna: dibangkitkan otomatis (lihat
 * `bangunNomorRtm`) agar konsisten dan bebas salah tulis. Kelas sosial & BDT
 * (Basis Data Terpadu) bersifat opsional karena sering belum tersedia.
 */
export const rumahTanggaFormSchema = z.object({
  alamat: optionalText(255),
  regionId: optionalSelectId,
  kelasSosial: z.preprocess(
    (value) => (value === "" || value === NO_SELECTION || value === null ? null : value),
    z.coerce.number().int().min(0, "Minimal 0.").max(99, "Maksimal 99.").nullable(),
  ),
  bdt: optionalText(30),
});

export type RumahTanggaFormInput = z.infer<typeof rumahTanggaFormSchema>;

// --- Nomor RTM -------------------------------------------------------------

/** Panjang nomor urut pada nomor RTM. */
const NOMOR_URUT_LENGTH = 5;

/**
 * Bangun nomor RTM dari kode desa dan nomor urut.
 *
 * Pola mengikuti sistem rujukan (`kode_desa` + nomor urut 5 digit) tetapi
 * diterapkan pada nomor **RTM sendiri**. `urut` adalah nomor urut global desa
 * (mis. jumlah RTM + 1); bagian kode desa dipangkas agar hasilnya tidak terlalu
 * panjang dan tetap unik per desa berkat indeks unik `(village_id, number)`.
 */
export function bangunNomorRtm(kodeDesa: string | null, urut: number): string {
  const kode = (kodeDesa ?? "").trim().replace(/[^0-9]/g, "");
  const urutan = String(Math.max(1, Math.trunc(urut))).padStart(NOMOR_URUT_LENGTH, "0");
  return kode === "" ? urutan : `${kode}${urutan}`;
}

// --- Bentuk data untuk UI --------------------------------------------------

/** Bentuk data rumah tangga yang dikirim ke UI (tanpa kolom internal). */
export interface RumahTanggaDTO {
  id: number;
  number: string;
  address: string | null;
  regionId: number | null;
  kelasSosial: number | null;
  bdt: string | null;
}

/** Baris tabel rumah tangga: DTO ditambah data turunan hasil join/agregasi. */
export interface RumahTanggaListRow extends RumahTanggaDTO {
  headName: string | null;
  memberCount: number;
  regionLabel: string | null;
}

/** Satu anggota rumah tangga untuk tampilan rincian. */
export interface RumahTanggaMember {
  id: number;
  name: string;
  nationalId: string | null;
  level: number | null;
}

/**
 * Data referensi yang dibutuhkan formulir rumah tangga.
 *
 * `penduduk` berisi seluruh penduduk desa (dengan NIK) untuk dipilih saat
 * menautkan anggota; `regions` untuk memilih wilayah domisili.
 */
export interface RumahTanggaReferenceData {
  regions: LabelOption[];
  penduduk: LabelOption[];
}

// --- Filter daftar rumah tangga -------------------------------------------

/** Pilihan penyaringan kepemilikan nomor BDT. */
export const RTM_BDT_FILTERS = ["ada", "tidak"] as const;
export type RtmBdtFilter = (typeof RTM_BDT_FILTERS)[number];

export const RTM_BDT_LABELS: Readonly<Record<RtmBdtFilter, string>> = {
  ada: "Punya BDT",
  tidak: "Tanpa BDT",
};

export interface RtmFilter {
  search: string;
  kelasSosial: number | null;
  dusun: string;
  rw: string;
  rt: string;
  bdt: RtmBdtFilter | null;
}

type NilaiParam = string | string[] | undefined;

function ambilTeks(param: NilaiParam): string {
  if (Array.isArray(param)) return param[0]?.trim() ?? "";
  return param?.trim() ?? "";
}

/** Filter kosong tanpa batasan apa pun. */
export function filterRtmKosong(): RtmFilter {
  return { search: "", kelasSosial: null, dusun: "", rw: "", rt: "", bdt: null };
}

/**
 * Ubah query string halaman menjadi filter RTM tervalidasi.
 *
 * Nilai tak dikenal diabaikan agar tautan lama tidak menampilkan galat.
 */
export function parseFilterRtm(params: Record<string, NilaiParam>): RtmFilter {
  const kelasTeks = ambilTeks(params.kelasSosial);
  const kelas = kelasTeks === "" ? null : Number(kelasTeks);
  const bdt = ambilTeks(params.bdt);

  return {
    search: ambilTeks(params.q),
    kelasSosial: kelas !== null && Number.isInteger(kelas) && kelas >= 0 ? kelas : null,
    dusun: ambilTeks(params.dusun),
    rw: ambilTeks(params.rw),
    rt: ambilTeks(params.rt),
    bdt: (RTM_BDT_FILTERS as readonly string[]).includes(bdt) ? (bdt as RtmBdtFilter) : null,
  };
}

/** Query string dari filter (tanpa parameter halaman). */
export function filterRtmKeSearchParams(filter: RtmFilter): URLSearchParams {
  const query = new URLSearchParams();
  if (filter.search) query.set("q", filter.search);
  if (filter.kelasSosial !== null) query.set("kelasSosial", String(filter.kelasSosial));
  if (filter.dusun) query.set("dusun", filter.dusun);
  if (filter.rw) query.set("rw", filter.rw);
  if (filter.rt) query.set("rt", filter.rt);
  if (filter.bdt) query.set("bdt", filter.bdt);
  return query;
}

/** Jumlah filter aktif selain pencarian. */
export function hitungFilterRtm(filter: RtmFilter): number {
  return [filter.kelasSosial, filter.dusun, filter.rw, filter.rt, filter.bdt].filter(
    (item) => item !== null && item !== "",
  ).length;
}

// --- Laporan rumah tangga --------------------------------------------------

/** Label untuk RTM yang belum diisi kelas sosialnya. */
export const RTM_TANPA_KELAS = "(Belum ada kelas sosial)";
/** Label untuk RTM yang wilayahnya belum ditentukan. */
export const RTM_TANPA_DUSUN = "(Belum ada dusun)";

/** Satu baris rekapitulasi RTM (per kelas sosial atau per dusun). */
export interface RtmRekapRow {
  label: string;
  jumlahRtm: number;
  jumlahAnggota: number;
  percentage: number;
}

export interface RtmRekap {
  totalRtm: number;
  totalAnggota: number;
  perKelasSosial: RtmRekapRow[];
  perDusun: RtmRekapRow[];
}

/** Baris ringkas yang dibutuhkan rekapitulasi. */
export interface RtmRekapInput {
  kelasSosial: number | null;
  dusun: string | null;
  anggota: number;
}

/** Kelompokkan baris ringkas menjadi rekapitulasi (fungsi murni). */
function kelompokkan(
  rows: readonly RtmRekapInput[],
  kunci: (row: RtmRekapInput) => string,
): RtmRekapRow[] {
  const peta = new Map<string, { jumlahRtm: number; jumlahAnggota: number }>();

  for (const row of rows) {
    const label = kunci(row);
    const nilai = peta.get(label) ?? { jumlahRtm: 0, jumlahAnggota: 0 };
    nilai.jumlahRtm += 1;
    nilai.jumlahAnggota += row.anggota;
    peta.set(label, nilai);
  }

  const total = rows.length;

  return [...peta.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "id", { numeric: true }))
    .map(([label, nilai]) => ({
      label,
      jumlahRtm: nilai.jumlahRtm,
      jumlahAnggota: nilai.jumlahAnggota,
      percentage: total === 0 ? 0 : Math.round((nilai.jumlahRtm / total) * 10000) / 100,
    }));
}

/**
 * Rekapitulasi rumah tangga menurut kelas sosial dan dusun.
 *
 * Dua sudut pandang karena laporan desa lazim memakainya bersama: sebaran
 * kesejahteraan (kelas sosial) dan sebaran wilayah (dusun).
 */
export function hitungRekapRtm(rows: readonly RtmRekapInput[]): RtmRekap {
  return {
    totalRtm: rows.length,
    totalAnggota: rows.reduce((jumlah, row) => jumlah + row.anggota, 0),
    perKelasSosial: kelompokkan(rows, (row) =>
      row.kelasSosial === null ? RTM_TANPA_KELAS : `Kelas ${row.kelasSosial}`,
    ),
    perDusun: kelompokkan(rows, (row) =>
      row.dusun && row.dusun.trim() !== "" ? row.dusun.trim() : RTM_TANPA_DUSUN,
    ),
  };
}

/** CSV laporan rumah tangga (dua blok: kelas sosial & dusun). */
export function buildRtmRekapCsv(input: { namaDesa: string | null; rekap: RtmRekap }): string {
  const baris: string[][] = [
    ["Laporan Rumah Tangga (RTM)"],
    [input.namaDesa ?? "-"],
    [],
    ["Rumah Tangga", String(input.rekap.totalRtm)],
    ["Anggota", String(input.rekap.totalAnggota)],
    [],
    ["Menurut Kelas Sosial"],
    ["Kelas Sosial", "Jumlah RTM", "Jumlah Anggota", "Persentase"],
  ];

  const tambah = (rows: readonly RtmRekapRow[]) => {
    for (const row of rows) {
      baris.push([
        row.label,
        String(row.jumlahRtm),
        String(row.jumlahAnggota),
        `${row.percentage}%`,
      ]);
    }
  };

  tambah(input.rekap.perKelasSosial);
  baris.push([], ["Menurut Dusun"], ["Dusun", "Jumlah RTM", "Jumlah Anggota", "Persentase"]);
  tambah(input.rekap.perDusun);

  return `\uFEFF${toCsv(baris)}`;
}

/** Nama berkas CSV laporan rumah tangga. */
export function rtmRekapFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `laporan-rumah-tangga-${slug}.csv`;
}
