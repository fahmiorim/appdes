import { selCsv } from "@/lib/spreadsheet";

import {
  formatSkor,
  hitungRekapIdm,
  hitungRekapSdgs,
  namaGoalSdgs,
  type IdmIndikatorDTO,
  type SdgsDTO,
} from "./idm";

/**
 * Laporan IDM & SDGs.
 *
 * Keluaran resmi memuat rekap tiga dimensi IDM, rincian indikator, dan capaian
 * 18 tujuan SDGs Desa dalam satu berkas CSV. Fungsi murni: pemanggil (route)
 * yang menyediakan data ter-scope tenant.
 */

export interface LaporanIdmInput {
  tahun: number;
  indikator: readonly IdmIndikatorDTO[];
  sdgs: readonly SdgsDTO[];
}

/** Nama berkas laporan untuk tahun tertentu. */
export function namaBerkasLaporanIdm(tahun: number): string {
  return `laporan-idm-sdgs-${tahun}.csv`;
}

/** Skor indikator (0–100) ditampilkan apa adanya, bukan sebagai desimal 0–1. */
function skorIndikator(skor: number | null): string {
  return skor === null || skor === undefined ? "" : String(skor);
}

/** CSV laporan IDM & SDGs, satu berkas untuk kebutuhan cetak/arsip. */
export function buildLaporanIdmCsv({ tahun, indikator, sdgs }: LaporanIdmInput): string {
  const rekap = hitungRekapIdm(indikator);
  const rekapSdgs = hitungRekapSdgs(sdgs);
  const baris: string[] = [];

  const tulis = (kolom: readonly (string | number | null)[]) => {
    baris.push(kolom.map((nilai) => selCsv(nilai)).join(","));
  };

  tulis([`Laporan IDM & SDGs Desa Tahun ${tahun}`]);
  tulis([]);

  tulis(["REKAP IDM"]);
  tulis(["Dimensi", "Kode", "Jumlah Indikator", "Skor"]);
  for (const dimensi of rekap.dimensi) {
    tulis([dimensi.label, dimensi.kode, dimensi.jumlahIndikator, formatSkor(dimensi.skor)]);
  }
  tulis(["Skor IDM", "", rekap.jumlahIndikator, formatSkor(rekap.skor)]);
  tulis(["Status", rekap.status ?? "-"]);
  tulis([]);

  tulis(["INDIKATOR IDM"]);
  tulis(["Kode", "Indikator", "Kategori", "Skor", "Keterangan"]);
  for (const row of indikator) {
    tulis([row.kode, row.nama, row.kategori ?? "", skorIndikator(row.skor), row.keterangan ?? ""]);
  }
  tulis([]);

  tulis(["CAPAIAN SDGs DESA"]);
  tulis(["Tujuan", "Nama Tujuan", "Skor", "Keterangan"]);
  for (const row of sdgs) {
    tulis([row.goal, namaGoalSdgs(row.goal), row.skor, row.keterangan ?? ""]);
  }
  tulis(["Skor SDGs", "", formatSkor(rekapSdgs.skor), rekapSdgs.predikat ?? "-"]);

  return `\uFEFF${baris.join("\r\n")}\r\n`;
}
