import "server-only";

import { susunTrenBulanan, type TitikTrenBulanan } from "@/features/dashboard/domain/tren-bulanan";
import {
  getDashboardStats,
  getStatistikUmur,
  getTrenPermohonan,
  listAktivitasTerbaru,
  listPermohonanTerbaru,
  type AktivitasRingkas,
  type DashboardStats,
  type KelompokUmur,
  type PermohonanTerbaru,
} from "@/features/dashboard/infrastructure/dashboard-repository";

/** Ringkasan statistik dashboard untuk satu desa. */
export async function dashboardStats(villageId: number): Promise<DashboardStats> {
  return getDashboardStats(villageId);
}

/** Tren permohonan surat `jumlahBulan` terakhir, sudah diisi bulan kosong. */
export async function dashboardTrenPermohonan(
  villageId: number,
  jumlahBulan = 6,
): Promise<TitikTrenBulanan[]> {
  const baris = await getTrenPermohonan(villageId, jumlahBulan);
  return susunTrenBulanan(baris, new Date(), jumlahBulan);
}

/** Permohonan surat terbaru untuk panel beranda. */
export async function dashboardPermohonanTerbaru(
  villageId: number,
  limit = 5,
): Promise<PermohonanTerbaru[]> {
  return listPermohonanTerbaru(villageId, limit);
}

/** Sebaran umur penduduk untuk tab statistik beranda. */
export async function dashboardStatistikUmur(villageId: number): Promise<KelompokUmur[]> {
  return getStatistikUmur(villageId);
}

/** Aktivitas terbaru desa untuk feed beranda. */
export async function dashboardAktivitasTerbaru(
  villageId: number,
  limit = 5,
): Promise<AktivitasRingkas[]> {
  return listAktivitasTerbaru(villageId, limit);
}
