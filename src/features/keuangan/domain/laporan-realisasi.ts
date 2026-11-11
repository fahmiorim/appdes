import {
  AKUN_LAPORAN,
  formatMoney,
  KEUANGAN_AKUN,
  kodeDepth,
  realisasiPersen,
  toMinor,
  type KeuanganBarisDTO,
  type RpApbdTotal,
} from "@/features/keuangan/domain/keuangan";
import { toCsv } from "@/features/keuangan/domain/laporan-csv";

/**
 * Laporan Realisasi Pelaksanaan APBDes format resmi.
 *
 * Meniru susunan laporan pada sistem rujukan: akun level-1 menjadi judul blok,
 * anak-anaknya ditampilkan berjenjang, lalu ditutup baris JUMLAH per akun,
 * SURPLUS/(DEFISIT), PEMBIAYAAN NETTO, dan SiLPA tahun berjalan. Seluruh
 * perhitungan memakai bilangan sen (bigint) agar tidak ada galat pembulatan.
 */

export interface BarisRealisasi {
  kode: string;
  uraian: string;
  /** Kedalaman tampilan: 1 = akun, 2 = bidang, 3+ = rincian. */
  depth: number;
  anggaran: string;
  realisasi: string;
  /** Anggaran − realisasi; negatif berarti realisasi melebihi pagu. */
  selisih: string;
  /** `null` untuk akun pembiayaan (persentase tidak bermakna). */
  persen: number | null;
}

export interface BlokRealisasi {
  akun: BarisRealisasi;
  /** Semua keturunan akun (bidang, kegiatan, rincian) berurutan menurut kode. */
  baris: BarisRealisasi[];
  /** Nilai akun (sudah teragregasi dari anaknya). */
  total: RpApbdTotal;
}

export interface RingkasanRealisasi {
  anggaran: string;
  realisasi: string;
  selisih: string;
}

export interface LaporanRealisasiResmi {
  blok: BlokRealisasi[];
  /** Pendapatan − belanja. */
  surplus: RingkasanRealisasi;
  /** Akun pembiayaan (netto: penerimaan − pengeluaran). */
  pembiayaanNetto: RingkasanRealisasi;
  /** Surplus + pembiayaan netto. */
  silpa: RingkasanRealisasi;
}

function namaAkun(kode: string): string {
  return KEUANGAN_AKUN.find((item) => item.kode === kode)?.nama ?? kode;
}

function selisihDari(anggaran: string, realisasi: string): string {
  return formatMoney(toMinor(anggaran) - toMinor(realisasi));
}

function ringkas(anggaran: string, realisasi: string): RingkasanRealisasi {
  return { anggaran, realisasi, selisih: selisihDari(anggaran, realisasi) };
}

function tambah(nilai: readonly RingkasanRealisasi[]): RingkasanRealisasi {
  const anggaran = formatMoney(nilai.reduce((acc, item) => acc + toMinor(item.anggaran), 0n));
  const realisasi = formatMoney(nilai.reduce((acc, item) => acc + toMinor(item.realisasi), 0n));
  return { anggaran, realisasi, selisih: selisihDari(anggaran, realisasi) };
}

function keBaris(row: KeuanganBarisDTO, tampilkanPersen: boolean): BarisRealisasi {
  return {
    kode: row.templateUuid,
    uraian: row.uraian,
    depth: kodeDepth(row.templateUuid),
    anggaran: row.anggaran,
    realisasi: row.realisasi,
    selisih: selisihDari(row.anggaran, row.realisasi),
    persen: tampilkanPersen ? realisasiPersen(row.anggaran, row.realisasi) : null,
  };
}

/**
 * Susun laporan resmi dari baris APBDes satu tahun anggaran.
 *
 * Hanya akun yang dapat dilaporkan (`4`, `5`, `6`) yang ditampilkan, sesuai
 * laporan APBDes. Akun yang belum punya data tetap muncul dengan nilai nol agar
 * struktur laporan utuh.
 */
export function susunLaporanRealisasi(rows: readonly KeuanganBarisDTO[]): LaporanRealisasiResmi {
  const byKode = new Map(rows.map((row) => [row.templateUuid, row]));

  const blok = AKUN_LAPORAN.map((akunKode): BlokRealisasi => {
    const akunRow = byKode.get(akunKode);
    const akun: BarisRealisasi = akunRow
      ? keBaris(akunRow, akunKode !== "6")
      : {
          kode: akunKode,
          uraian: namaAkun(akunKode),
          depth: 1,
          anggaran: "0.00",
          realisasi: "0.00",
          selisih: "0.00",
          persen: null,
        };

    const baris = rows
      .filter((row) => row.templateUuid.startsWith(`${akunKode}.`))
      .sort((a, b) => a.templateUuid.localeCompare(b.templateUuid))
      .map((row) => keBaris(row, akunKode !== "6"));

    return { akun, baris, total: { ...ringkas(akun.anggaran, akun.realisasi) } };
  });

  const pendapatan = blok.find((item) => item.akun.kode === "4")?.total ?? ringkas("0.00", "0.00");
  const belanja = blok.find((item) => item.akun.kode === "5")?.total ?? ringkas("0.00", "0.00");
  const pembiayaan = blok.find((item) => item.akun.kode === "6")?.total ?? ringkas("0.00", "0.00");

  const surplus = ringkas(
    formatMoney(toMinor(pendapatan.anggaran) - toMinor(belanja.anggaran)),
    formatMoney(toMinor(pendapatan.realisasi) - toMinor(belanja.realisasi)),
  );

  return {
    blok,
    surplus,
    pembiayaanNetto: pembiayaan,
    silpa: tambah([surplus, pembiayaan]),
  };
}

const HEADER_CSV = ["Kode", "Uraian", "Anggaran", "Realisasi", "Lebih/(Kurang)", "Persentase (%)"];

export interface LaporanRealisasiCsvInput {
  namaDesa: string | null;
  kecamatan: string | null;
  tahun: number;
  laporan: LaporanRealisasiResmi;
}

/**
 * Teks CSV laporan realisasi format resmi.
 *
 * Angka ditulis sebagai desimal polos agar dapat dijumlahkan langsung pada
 * lembar kerja; persentase pembiayaan dikosongkan seperti format rujukan.
 */
export function buildLaporanRealisasiCsv(input: LaporanRealisasiCsvInput): string {
  const rows: string[][] = [
    ["Laporan Realisasi Pelaksanaan APBDes"],
    [
      "Desa",
      input.namaDesa ?? "-",
      "Kecamatan",
      input.kecamatan ?? "-",
      "Tahun Anggaran",
      String(input.tahun),
    ],
    [],
    HEADER_CSV,
  ];

  const barisKeSel = (row: BarisRealisasi): string[] => [
    row.kode,
    `${"  ".repeat(Math.max(0, row.depth - 1))}${row.uraian}`,
    row.anggaran,
    row.realisasi,
    row.selisih,
    row.persen === null ? "" : row.persen.toFixed(2),
  ];

  for (const blok of input.laporan.blok) {
    rows.push(barisKeSel(blok.akun));
    for (const baris of blok.baris) rows.push(barisKeSel(baris));
    rows.push([
      "",
      `JUMLAH ${blok.akun.uraian.toUpperCase()}`,
      blok.total.anggaran,
      blok.total.realisasi,
      blok.total.selisih,
      blok.akun.kode === "6" ? "" : (blok.akun.persen ?? 0).toFixed(2),
    ]);

    if (blok.akun.kode === "5") {
      rows.push([
        "",
        "SURPLUS / (DEFISIT)",
        input.laporan.surplus.anggaran,
        input.laporan.surplus.realisasi,
        input.laporan.surplus.selisih,
        "",
      ]);
    }

    if (blok.akun.kode === "6") {
      rows.push([
        "",
        "PEMBIAYAAN NETTO",
        blok.total.anggaran,
        blok.total.realisasi,
        blok.total.selisih,
        "",
      ]);
      rows.push([
        "",
        "SILPA/SiLPA TAHUN BERJALAN",
        input.laporan.silpa.anggaran,
        input.laporan.silpa.realisasi,
        input.laporan.silpa.selisih,
        "",
      ]);
    }
  }

  return `\uFEFF${toCsv(rows)}`;
}

/** Nama berkas unduhan rincian realisasi. */
export function laporanRealisasiCsvFilename(namaDesa: string | null, tahun: number): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `rincian-realisasi-${slug}-${tahun}.csv`;
}
