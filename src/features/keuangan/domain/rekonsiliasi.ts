import { formatMoney, realisasiPersen, sumMoney, toMinor, type KeuanganBarisDTO } from "./keuangan";
import type { TriwulanBarisInput } from "./laporan-triwulan";

/**
 * Rekonsiliasi realisasi belanja: **realisasi tahunan APBDes** vs **jumlah
 * realisasi triwulan** untuk bidang yang sama (`5.x`).
 *
 * Kedua angka diisi terpisah oleh operator (APBDes dan laporan triwulan), jadi
 * selisih menandakan salah satu belum diperbarui. Modul ini murni (tanpa I/O)
 * agar aturan pencocokan dapat diuji tanpa basis data.
 */

export interface RekonsiliasiBaris {
  kode: string;
  uraian: string;
  anggaran: string;
  /** Realisasi tahunan dari tabel `keuangan` (buku APBDes). */
  realisasiTahunan: string;
  /** Penjumlahan TW I–IV dari tabel `keuangan_triwulan`. */
  realisasiTriwulan: string;
  /** `realisasiTriwulan − realisasiTahunan` (positif: triwulan lebih besar). */
  selisih: string;
  /** Kedua angka sama persis (dibandingkan sebagai sen). */
  cocok: boolean;
  persenTahunan: number;
  persenTriwulan: number;
}

type BarisTahunan = Pick<KeuanganBarisDTO, "templateUuid" | "uraian" | "anggaran" | "realisasi">;

function jumlahTriwulan(row: TriwulanBarisInput): string {
  return sumMoney([row.tw1, row.tw2, row.tw3, row.tw4]);
}

/**
 * Bandingkan realisasi tahunan dan triwulan per kode bidang.
 *
 * Kode yang hanya ada di salah satu sisi tetap ditampilkan dengan nilai nol di
 * sisi lainnya, supaya ketidaklengkapan data ikut terlihat. Hasil diurutkan
 * menurut kode.
 */
export function rekonsiliasiBidang(
  tahunan: readonly BarisTahunan[],
  triwulan: readonly TriwulanBarisInput[],
): RekonsiliasiBaris[] {
  const petaTahunan = new Map(tahunan.map((row) => [row.templateUuid, row]));
  const petaTriwulan = new Map(triwulan.map((row) => [row.kode, row]));

  const kode = [...new Set([...petaTahunan.keys(), ...petaTriwulan.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  return kode.map((item) => {
    const barisTahunan = petaTahunan.get(item);
    const barisTriwulan = petaTriwulan.get(item);

    const realisasiTahunan = barisTahunan?.realisasi ?? "0.00";
    const realisasiTriwulan = barisTriwulan ? jumlahTriwulan(barisTriwulan) : "0.00";
    const selisihSen = toMinor(realisasiTriwulan) - toMinor(realisasiTahunan);

    return {
      kode: item,
      uraian: barisTahunan?.uraian ?? barisTriwulan?.uraian ?? item,
      anggaran: barisTahunan?.anggaran ?? barisTriwulan?.anggaran ?? "0.00",
      realisasiTahunan,
      realisasiTriwulan,
      selisih: formatMoney(selisihSen),
      cocok: selisihSen === 0n,
      persenTahunan: realisasiPersen(barisTahunan?.anggaran ?? "0.00", realisasiTahunan),
      persenTriwulan: realisasiPersen(
        barisTriwulan?.anggaran ?? barisTahunan?.anggaran ?? "0.00",
        realisasiTriwulan,
      ),
    };
  });
}

export interface RekonsiliasiTotal {
  anggaran: string;
  realisasiTahunan: string;
  realisasiTriwulan: string;
  selisih: string;
  /** Jumlah bidang yang angkanya sama. */
  jumlahCocok: number;
  /** Jumlah bidang yang angkanya berbeda. */
  jumlahBeda: number;
}

/** Ringkasan seluruh bidang untuk kartu statistik & footer tabel. */
export function totalRekonsiliasi(rows: readonly RekonsiliasiBaris[]): RekonsiliasiTotal {
  const realisasiTahunan = sumMoney(rows.map((row) => row.realisasiTahunan));
  const realisasiTriwulan = sumMoney(rows.map((row) => row.realisasiTriwulan));

  return {
    anggaran: sumMoney(rows.map((row) => row.anggaran)),
    realisasiTahunan,
    realisasiTriwulan,
    selisih: formatMoney(toMinor(realisasiTriwulan) - toMinor(realisasiTahunan)),
    jumlahCocok: rows.filter((row) => row.cocok).length,
    jumlahBeda: rows.filter((row) => !row.cocok).length,
  };
}
