import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  hitungLaporanPenduduk,
  isLaporanPendudukJenis,
  type LaporanPendudukJenis,
  type StatistikKependudukan,
} from "@/features/penduduk/domain/laporan-penduduk";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { listPendudukStatistik } from "@/features/penduduk/infrastructure/laporan-penduduk-repository";
import { requirePermission } from "@/lib/dal";

/**
 * Laporan kependudukan diturunkan dari data penduduk yang ada.
 *
 * Penduduk diambil sekali, lalu dihitung untuk jenis laporan yang diminta;
 * halaman juga menampilkan ringkasan dasar (total, laki-laki, perempuan)
 * sehingga operator tidak perlu berpindah tab.
 */
export interface LaporanPenduduk {
  jenis: LaporanPendudukJenis;
  statistik: StatistikKependudukan;
}

/** Apakah `value` jenis laporan yang dikenal? */
export function normalisasiJenis(value: string | undefined): LaporanPendudukJenis {
  return value && isLaporanPendudukJenis(value) ? value : "umur";
}

export async function getLaporanPenduduk(jenisParam?: string): Promise<LaporanPenduduk> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const jenis = normalisasiJenis(jenisParam);
  const penduduk = await listPendudukStatistik(villageId);

  return { jenis, statistik: hitungLaporanPenduduk(jenis, penduduk) };
}
