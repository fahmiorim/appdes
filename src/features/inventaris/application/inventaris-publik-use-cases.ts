import "server-only";

import type { InventarisRow } from "@/features/inventaris/domain/inventaris";
import { listInventaris } from "@/features/inventaris/infrastructure/inventaris-repository";
import {
  FILTER_INVENTARIS_KOSONG,
  opsiFilterInventaris,
  saringInventaris,
  type FilterInventarisPublik,
} from "@/features/publik/domain/inventaris-publik";
import { rekapInventaris, type RekapInventaris } from "@/features/publik/domain/ringkasan-publik";

export type InventarisPublikRow = InventarisRow & {
  kategoriNama: string | null;
  kategoriKode: string | null;
};

export interface InventarisPublik {
  rows: InventarisPublikRow[];
  rekap: RekapInventaris;
  /** Pilihan filter dari seluruh data desa (bukan hanya hasil saringan). */
  opsi: { kategori: string[]; lokasi: string[]; tahun: number[] };
}

/**
 * Data inventaris untuk situs publik.
 *
 * Hanya barang yang belum dihapus yang dikembalikan repository. Tidak ada
 * pemeriksaan izin karena halaman ini memang transparansi aset desa; tenant
 * tetap dibatasi `villageId` dari host. Filter publik (kategori, kondisi,
 * lokasi, tahun, kata kunci) diterapkan sebelum rekap dihitung agar ringkasan
 * selalu cocok dengan daftar yang tampil.
 */
/** Daftar inventaris mentah untuk API publik; tenant dari host. */
export async function cariInventarisPublik(villageId: number, search = "") {
  return listInventaris(villageId, search);
}

export async function getInventarisPublik(
  villageId: number,
  filter: FilterInventarisPublik = FILTER_INVENTARIS_KOSONG,
): Promise<InventarisPublik> {
  const { rows } = await listInventaris(villageId);
  const tersaring = saringInventaris(rows, filter);

  return {
    rows: tersaring,
    rekap: rekapInventaris(tersaring),
    opsi: opsiFilterInventaris(rows),
  };
}
