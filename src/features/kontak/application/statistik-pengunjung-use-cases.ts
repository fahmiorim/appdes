import { getStatistikPengunjung } from "@/features/kontak/infrastructure/pengunjung-repository";

/**
 * Use case untuk statistik pengunjung.
 */

export interface StatistikPengunjungParams {
  villageId: number;
  halaman: string;
  jumlahHari?: number;
}

/**
 * Ambil statistik pengunjung untuk halaman tertentu.
 */
export async function getStatistikPengunjungPublik(params: StatistikPengunjungParams) {
  return getStatistikPengunjung(params.villageId, params.halaman, params.jumlahHari ?? 30);
}
