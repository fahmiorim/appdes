import { selCsv } from "@/lib/spreadsheet";

import { formatAnggaran, statusPembangunanLabel, type PembangunanProyekDTO } from "./pembangunan";

/**
 * Buku pembangunan desa.
 *
 * Rekap resmi per tahun anggaran: jumlah proyek per status, total anggaran, dan
 * rata-rata progres, disertai rincian proyek. Fungsi murni agar dapat diuji dan
 * dipakai bersama oleh halaman cetak dan ekspor CSV.
 */

export interface BukuPembangunanBaris {
  tahun: number;
  jumlahProyek: number;
  selesai: number;
  berjalan: number;
  rencana: number;
  dibatalkan: number;
  totalAnggaran: number;
  progresRataRata: number;
  proyek: PembangunanProyekDTO[];
}

export interface TotalBukuPembangunan {
  jumlahProyek: number;
  totalAnggaran: number;
  progresRataRata: number;
  selesai: number;
}

/** Angka anggaran proyek (`"1500000.00"`) → angka; nilai tak valid menjadi 0. */
export function angkaAnggaran(nilai: string | null): number {
  if (nilai === null || nilai.trim() === "") return 0;
  const angka = Number(nilai);
  return Number.isFinite(angka) ? angka : 0;
}

/** Kelompokkan proyek per tahun anggaran, tahun terbaru lebih dulu. */
export function buildBukuPembangunan(
  rows: readonly PembangunanProyekDTO[],
): BukuPembangunanBaris[] {
  const peta = new Map<number, PembangunanProyekDTO[]>();

  for (const row of rows) {
    const daftar = peta.get(row.tahunAnggaran);
    if (daftar) daftar.push(row);
    else peta.set(row.tahunAnggaran, [row]);
  }

  return [...peta.entries()]
    .map(([tahun, proyek]) => {
      const jumlahProyek = proyek.length;
      const totalAnggaran = proyek.reduce((total, item) => total + angkaAnggaran(item.anggaran), 0);
      const progresRataRata =
        jumlahProyek === 0
          ? 0
          : Math.round(proyek.reduce((total, item) => total + item.progres, 0) / jumlahProyek);

      return {
        tahun,
        jumlahProyek,
        selesai: proyek.filter((item) => item.status === "selesai").length,
        berjalan: proyek.filter((item) => item.status === "berjalan").length,
        rencana: proyek.filter((item) => item.status === "rencana").length,
        dibatalkan: proyek.filter((item) => item.status === "dibatalkan").length,
        totalAnggaran,
        progresRataRata,
        proyek: [...proyek].sort((a, b) => a.judul.localeCompare(b.judul, "id") || a.id - b.id),
      } satisfies BukuPembangunanBaris;
    })
    .sort((a, b) => b.tahun - a.tahun);
}

/** Total lintas tahun untuk baris ringkasan buku. */
export function totalBukuPembangunan(baris: readonly BukuPembangunanBaris[]): TotalBukuPembangunan {
  const jumlahProyek = baris.reduce((total, item) => total + item.jumlahProyek, 0);
  const totalAnggaran = baris.reduce((total, item) => total + item.totalAnggaran, 0);
  const selesai = baris.reduce((total, item) => total + item.selesai, 0);

  return {
    jumlahProyek,
    totalAnggaran,
    selesai,
    progresRataRata:
      jumlahProyek === 0
        ? 0
        : Math.round(
            baris.reduce((total, item) => total + item.progresRataRata * item.jumlahProyek, 0) /
              jumlahProyek,
          ),
  };
}

/** Nama berkas CSV; menyertakan tahun bila difilter. */
export function namaBerkasBukuPembangunan(tahun: number | null): string {
  return tahun === null ? "buku-pembangunan.csv" : `buku-pembangunan-${tahun}.csv`;
}

/** CSV buku pembangunan: rekap per tahun lalu rincian setiap proyek. */
export function buildBukuPembangunanCsv(baris: readonly BukuPembangunanBaris[]): string {
  const lines: string[] = [];
  const tulis = (kolom: readonly (string | number | null)[]) => {
    lines.push(kolom.map((nilai) => selCsv(nilai)).join(","));
  };

  tulis(["BUKU PEMBANGUNAN DESA"]);
  tulis([
    "Tahun",
    "Jumlah Proyek",
    "Selesai",
    "Berjalan",
    "Rencana",
    "Dibatalkan",
    "Anggaran",
    "Progres (%)",
  ]);
  for (const item of baris) {
    tulis([
      item.tahun,
      item.jumlahProyek,
      item.selesai,
      item.berjalan,
      item.rencana,
      item.dibatalkan,
      item.totalAnggaran,
      item.progresRataRata,
    ]);
  }

  const total = totalBukuPembangunan(baris);
  tulis([
    "TOTAL",
    total.jumlahProyek,
    total.selesai,
    "",
    "",
    "",
    total.totalAnggaran,
    total.progresRataRata,
  ]);
  tulis([]);

  tulis(["RINCIAN PROYEK"]);
  tulis([
    "Tahun",
    "Judul",
    "Lokasi",
    "Sumber Dana",
    "Anggaran",
    "Volume",
    "Satuan",
    "Pelaksana",
    "Status",
    "Progres (%)",
    "Hasil",
  ]);
  for (const item of baris) {
    for (const proyek of item.proyek) {
      tulis([
        item.tahun,
        proyek.judul,
        proyek.lokasi ?? "",
        proyek.sumberDana ?? "",
        proyek.anggaran ?? "",
        proyek.volume ?? "",
        proyek.satuan ?? "",
        proyek.pelaksana ?? "",
        statusPembangunanLabel(proyek.status),
        proyek.progres,
        proyek.hasil ?? "",
      ]);
    }
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Anggaran dalam format rupiah untuk tampilan cetak. */
export function anggaranTampil(nilai: number): string {
  return formatAnggaran(String(nilai));
}
