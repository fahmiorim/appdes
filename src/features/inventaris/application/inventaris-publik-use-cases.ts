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

export type InventarisPublikRow = Pick<
  InventarisRow,
  | "id"
  | "kategoriId"
  | "nomorInventaris"
  | "namaBarang"
  | "kodeBarang"
  | "merk"
  | "tipe"
  | "jumlah"
  | "satuan"
  | "nilaiAkhir"
  | "tahunPembelian"
  | "tanggalPembelian"
  | "kondisi"
  | "lokasi"
> & {
  kategoriNama: string | null;
  kategoriKode: string | null;
};

function barisAmanUntukPublik(
  row: InventarisRow & { kategoriNama: string | null; kategoriKode: string | null },
): InventarisPublikRow {
  return {
    id: row.id,
    kategoriId: row.kategoriId,
    nomorInventaris: row.nomorInventaris,
    namaBarang: row.namaBarang,
    kodeBarang: row.kodeBarang,
    merk: row.merk,
    tipe: row.tipe,
    jumlah: row.jumlah,
    satuan: row.satuan,
    nilaiAkhir: row.nilaiAkhir,
    tahunPembelian: row.tahunPembelian,
    tanggalPembelian: row.tanggalPembelian,
    kondisi: row.kondisi,
    lokasi: row.lokasi,
    kategoriNama: row.kategoriNama,
    kategoriKode: row.kategoriKode,
  };
}

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
  const data = await listInventaris(villageId, search);
  return { rows: data.rows.map(barisAmanUntukPublik), total: data.total };
}

export async function getInventarisPublik(
  villageId: number,
  filter: FilterInventarisPublik = FILTER_INVENTARIS_KOSONG,
): Promise<InventarisPublik> {
  const { rows: rawRows } = await listInventaris(villageId);
  const rows = rawRows.map(barisAmanUntukPublik);
  const tersaring = saringInventaris(rows, filter);

  return {
    rows: tersaring,
    rekap: rekapInventaris(tersaring),
    opsi: opsiFilterInventaris(rows),
  };
}
