import { formatMoney, sumMoney, toMinor } from "@/features/keuangan/domain/keuangan";
import { toCsv } from "@/features/keuangan/domain/laporan-csv";

import {
  INVENTARIS_KONDISI,
  INVENTARIS_KONDISI_LABELS,
  type InventarisKondisi,
  type InventarisRow,
} from "./inventaris";

/**
 * Laporan dan neraca aset inventaris.
 *
 * Seluruh fungsi di sini murni (tanpa I/O) agar bisa diuji tanpa basis data.
 * Nilai uang dihitung dalam satuan sen (bigint) lewat helper keuangan agar
 * penjumlahan rupiah tetap presisi, lalu dikembalikan sebagai string desimal.
 */

/** Baris inventaris yang sudah di-join dengan kategorinya. */
export type LaporanInventarisItem = InventarisRow & {
  kategoriNama: string | null;
  kategoriKode: string | null;
};

const TANPA_KATEGORI = "Tanpa kategori";

function kategoriLabel(item: LaporanInventarisItem): string {
  return item.kategoriNama?.trim() || TANPA_KATEGORI;
}

/** Kunci pengelompokan stabil: pakai id bila ada, jatuh ke nama bila tidak. */
function kategoriKey(item: LaporanInventarisItem): string {
  return item.kategoriId != null ? `id:${item.kategoriId}` : `nama:${kategoriLabel(item)}`;
}

export interface RekapKategoriBaris {
  kategoriId: number | null;
  nama: string;
  kode: string | null;
  jumlahBarang: number;
  totalUnit: string;
  totalNilai: string;
}

export interface RekapPerKategori {
  baris: RekapKategoriBaris[];
  total: { jumlahBarang: number; totalUnit: string; totalNilai: string };
}

interface KategoriAkumulasi {
  kategoriId: number | null;
  nama: string;
  kode: string | null;
  jumlahBarang: number;
  unit: string[];
  nilai: string[];
  nilaiPerKondisi: Record<InventarisKondisi, bigint>;
}

function kondisiKosong(): Record<InventarisKondisi, bigint> {
  return INVENTARIS_KONDISI.reduce(
    (acc, kondisi) => {
      acc[kondisi] = 0n;
      return acc;
    },
    {} as Record<InventarisKondisi, bigint>,
  );
}

function kelompokkanKategori(items: readonly LaporanInventarisItem[]): KategoriAkumulasi[] {
  const peta = new Map<string, KategoriAkumulasi>();

  for (const item of items) {
    const key = kategoriKey(item);
    const current =
      peta.get(key) ??
      ({
        kategoriId: item.kategoriId,
        nama: kategoriLabel(item),
        kode: item.kategoriKode,
        jumlahBarang: 0,
        unit: [],
        nilai: [],
        nilaiPerKondisi: kondisiKosong(),
      } satisfies KategoriAkumulasi);
    current.jumlahBarang += 1;
    current.unit.push(item.jumlah);
    const nilai = item.nilaiAkhir ?? "0.00";
    current.nilai.push(nilai);
    current.nilaiPerKondisi[item.kondisi] += toMinor(nilai);
    peta.set(key, current);
  }

  return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

/**
 * Rekap jumlah unit dan nilai aset per kategori, beserta total keseluruhan.
 */
export function rekapPerKategori(items: readonly LaporanInventarisItem[]): RekapPerKategori {
  const baris = kelompokkanKategori(items).map<RekapKategoriBaris>((group) => ({
    kategoriId: group.kategoriId,
    nama: group.nama,
    kode: group.kode,
    jumlahBarang: group.jumlahBarang,
    totalUnit: sumMoney(group.unit),
    totalNilai: sumMoney(group.nilai),
  }));

  return {
    baris,
    total: {
      jumlahBarang: items.length,
      totalUnit: sumMoney(items.map((item) => item.jumlah)),
      totalNilai: sumMoney(items.map((item) => item.nilaiAkhir ?? "0.00")),
    },
  };
}

export interface NeracaKategoriBaris {
  kategoriId: number | null;
  nama: string;
  kode: string | null;
  jumlahBarang: number;
  totalUnit: string;
  nilaiPerKondisi: Record<InventarisKondisi, string>;
  totalNilai: string;
}

export interface NeracaAset {
  baris: NeracaKategoriBaris[];
  totalPerKondisi: Record<InventarisKondisi, string>;
  grandTotal: string;
}

function formatKondisi(
  minor: Record<InventarisKondisi, bigint>,
): Record<InventarisKondisi, string> {
  return INVENTARIS_KONDISI.reduce(
    (acc, kondisi) => {
      acc[kondisi] = formatMoney(minor[kondisi]);
      return acc;
    },
    {} as Record<InventarisKondisi, string>,
  );
}

/**
 * Neraca kekayaan desa: nilai aset per kategori dipecah menurut kondisi
 * (baik/rusak ringan/rusak berat), lengkap dengan total per kondisi dan
 * grand total kekayaan seluruh aset.
 */
export function neracaAset(items: readonly LaporanInventarisItem[]): NeracaAset {
  const totalPerKondisi = kondisiKosong();

  const baris = kelompokkanKategori(items).map<NeracaKategoriBaris>((group) => {
    for (const kondisi of INVENTARIS_KONDISI) {
      totalPerKondisi[kondisi] += group.nilaiPerKondisi[kondisi];
    }
    return {
      kategoriId: group.kategoriId,
      nama: group.nama,
      kode: group.kode,
      jumlahBarang: group.jumlahBarang,
      totalUnit: sumMoney(group.unit),
      nilaiPerKondisi: formatKondisi(group.nilaiPerKondisi),
      totalNilai: sumMoney(group.nilai),
    };
  });

  return {
    baris,
    totalPerKondisi: formatKondisi(totalPerKondisi),
    grandTotal: sumMoney(items.map((item) => item.nilaiAkhir ?? "0.00")),
  };
}

/**
 * CSV laporan inventaris; bila `kategoriId` diberikan hanya aset kategori itu
 * yang disertakan. Nilai ditulis sebagai desimal polos agar bisa dijumlahkan
 * langsung di lembar kerja.
 */
export function buildInventarisCsv(
  items: readonly LaporanInventarisItem[],
  kategoriId?: number | null,
): string {
  const terpilih =
    kategoriId == null ? items : items.filter((item) => item.kategoriId === kategoriId);

  const header = [
    "Kategori",
    "Nomor Inventaris",
    "Kode Barang",
    "Nama Barang",
    "Jumlah",
    "Satuan",
    "Nilai Akhir",
    "Kondisi",
    "Lokasi",
  ];

  const baris = terpilih.map((item) => [
    kategoriLabel(item),
    item.nomorInventaris ?? "",
    item.kodeBarang ?? "",
    item.namaBarang,
    item.jumlah,
    item.satuan ?? "",
    item.nilaiAkhir ?? "0.00",
    INVENTARIS_KONDISI_LABELS[item.kondisi] ?? item.kondisi,
    item.lokasi ?? "",
  ]);

  const total = [
    "",
    "",
    "",
    "Jumlah",
    sumMoney(terpilih.map((item) => item.jumlah)),
    "",
    sumMoney(terpilih.map((item) => item.nilaiAkhir ?? "0.00")),
    "",
    "",
  ];

  return `\uFEFF${toCsv([header, ...baris, total])}`;
}

/** Nama berkas aman untuk unduhan laporan inventaris. */
export function inventarisCsvFilename(
  namaDesa: string | null,
  kategoriNama?: string | null,
): string {
  const slug = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const desa = slug(namaDesa ?? "desa") || "desa";
  const kategori = kategoriNama ? `-${slug(kategoriNama)}` : "";
  return `laporan-inventaris-${desa}${kategori}.csv`;
}
