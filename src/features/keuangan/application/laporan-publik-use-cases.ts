import "server-only";

import {
  AKUN_LAPORAN,
  formatMoney,
  laporanRpApbd,
  listBidangBelanja,
  realisasiPersen,
  seriGrafik,
  toMinor,
  totalLaporan,
} from "@/features/keuangan/domain/keuangan";
import {
  buildTriwulanRows,
  ringkasRealisasiPeriode,
  totalTriwulan,
  type TriwulanBarisInput,
} from "@/features/keuangan/domain/laporan-triwulan";
import {
  listKeuanganTahun,
  listKeuanganTahunTersedia,
  listKeuanganTriwulan,
} from "@/features/keuangan/infrastructure/keuangan-repository";

const TAHUN_MIN = 2000;
const TAHUN_MAX = 2100;

function tahunValid(value: number): boolean {
  return Number.isInteger(value) && value >= TAHUN_MIN && value <= TAHUN_MAX;
}

/**
 * Laporan APBDes untuk **situs publik**.
 *
 * Berbeda dari `getLaporanKeuangan()` (jalur admin yang memeriksa izin), fungsi
 * ini hanya butuh `villageId` dari host sehingga warga tanpa akun tetap dapat
 * melihat transparansi anggaran. Isi laporan identik karena keduanya memakai
 * fungsi murni yang sama di `domain/keuangan.ts`.
 */
export async function getLaporanApbdesPublik(villageId: number, tahunParam?: number) {
  const tersedia = await listKeuanganTahunTersedia(villageId);
  const tahun =
    tahunParam !== undefined && tahunValid(tahunParam) && tersedia.includes(tahunParam)
      ? tahunParam
      : (tersedia.at(-1) ?? new Date().getFullYear());

  const [rows, triwulan] = await Promise.all([
    listKeuanganTahun(villageId, tahun),
    listKeuanganTriwulan(villageId, tahun),
  ]);
  const baris = laporanRpApbd(rows, AKUN_LAPORAN);
  const bidang = listBidangBelanja(rows).map((row) => ({
    kode: row.templateUuid,
    uraian: row.uraian,
    anggaran: row.anggaran,
    realisasi: row.realisasi,
    selisih: formatMoney(toMinor(row.anggaran) - toMinor(row.realisasi)),
    persen: realisasiPersen(row.anggaran, row.realisasi),
  }));

  // Dimensi periode: realisasi per triwulan untuk tahun terpilih. Pagu tetap
  // dari pohon rekening; nilai triwulan dibaca apa adanya dari keuangan_triwulan.
  const byKode = new Map(triwulan.map((row) => [row.templateUuid, row]));
  const triwulanInput: TriwulanBarisInput[] = listBidangBelanja(rows).map((row) => {
    const nilai = byKode.get(row.templateUuid);
    return {
      kode: row.templateUuid,
      uraian: row.uraian,
      anggaran: row.anggaran,
      tw1: nilai?.tw1 ?? "0.00",
      tw2: nilai?.tw2 ?? "0.00",
      tw3: nilai?.tw3 ?? "0.00",
      tw4: nilai?.tw4 ?? "0.00",
    };
  });
  const totalTw = totalTriwulan(buildTriwulanRows(triwulanInput));

  return {
    tahun,
    tersedia,
    baris,
    total: totalLaporan(baris),
    bidang,
    totalBidang: totalLaporan(bidang),
    grafik: seriGrafik(baris),
    periode: ringkasRealisasiPeriode(totalTw),
  };
}
/**
 * Laporan realisasi triwulan untuk situs publik.
 *
 * Nilai triwulan dibaca langsung dari `keuangan_triwulan`; pagu anggaran tetap
 * berasal dari `keuangan` pada tahun yang sama. Tidak ada estimasi
 * `realisasi = anggaran` seperti versi lama halaman `/desa/idm-sdgs`.
 */
export async function getLaporanTriwulanPublik(villageId: number, tahunParam?: number) {
  const tersedia = await listKeuanganTahunTersedia(villageId);
  const tahun =
    tahunParam !== undefined && tahunValid(tahunParam)
      ? tahunParam
      : (tersedia.at(-1) ?? new Date().getFullYear());

  const [rows, tersimpan] = await Promise.all([
    listKeuanganTahun(villageId, tahun),
    listKeuanganTriwulan(villageId, tahun),
  ]);

  const byKode = new Map(tersimpan.map((row) => [row.templateUuid, row]));
  const bidang = listBidangBelanja(rows);
  const input: TriwulanBarisInput[] = bidang.map((row) => {
    const nilai = byKode.get(row.templateUuid);
    return {
      kode: row.templateUuid,
      uraian: row.uraian,
      anggaran: row.anggaran,
      tw1: nilai?.tw1 ?? "0.00",
      tw2: nilai?.tw2 ?? "0.00",
      tw3: nilai?.tw3 ?? "0.00",
      tw4: nilai?.tw4 ?? "0.00",
    };
  });

  const baris = buildTriwulanRows(input);

  return { tahun, tersedia, baris, total: totalTriwulan(baris) };
}
