import {
  INVENTARIS_KONDISI,
  INVENTARIS_KONDISI_LABELS,
  type InventarisKondisi,
} from "@/features/inventaris/domain/inventaris";
import { csvCell } from "@/lib/csv";

/**
 * Filter dan ekspor CSV inventaris untuk situs publik.
 *
 * Fungsi murni tanpa I/O: halaman publik memakainya untuk menyaring baris yang
 * sudah di-scope tenant oleh repository, dan rute ekspor memakai penyusun CSV
 * yang sama agar unduhan selalu konsisten dengan tampilan.
 */

export interface FilterInventarisPublik {
  /** Kata kunci nama/kode barang. */
  cari: string;
  /** Nama kategori; string kosong berarti semua. */
  kategori: string;
  /** Kondisi barang; string kosong berarti semua. */
  kondisi: string;
  /** Lokasi penyimpanan; string kosong berarti semua. */
  lokasi: string;
  tahun: number | null;
}

export const FILTER_INVENTARIS_KOSONG: FilterInventarisPublik = {
  cari: "",
  kategori: "",
  kondisi: "",
  lokasi: "",
  tahun: null,
};

export interface BarisInventarisPublik {
  namaBarang: string;
  kodeBarang: string | null;
  nomorInventaris: string | null;
  kategoriNama: string | null;
  kondisi: string;
  lokasi: string | null;
  tahunPembelian: number | null;
}

export interface BarisInventarisCsv extends BarisInventarisPublik {
  jumlah: string;
  satuan: string | null;
  nilaiAkhir: string | null;
}

const MAKS_TEKS_FILTER = 150;

function teks(value: string | undefined, maks = MAKS_TEKS_FILTER): string {
  return typeof value === "string" ? value.trim().slice(0, maks) : "";
}

/** Baca filter dari query string; nilai tak dikenal diabaikan ke "semua". */
export function parseFilterInventaris(
  input: Record<string, string | undefined>,
): FilterInventarisPublik {
  const kondisi = teks(input.kondisi, 32).toLowerCase();
  const rawTahun = input.tahun === undefined ? Number.NaN : Number(input.tahun);
  const tahun =
    Number.isInteger(rawTahun) && rawTahun >= 1900 && rawTahun <= 2100 ? rawTahun : null;

  return {
    cari: teks(input.q, 100),
    kategori: teks(input.kategori),
    kondisi: (INVENTARIS_KONDISI as readonly string[]).includes(kondisi) ? kondisi : "",
    lokasi: teks(input.lokasi),
    tahun,
  };
}

/** Apakah ada filter yang aktif? Dipakai untuk pesan kosong di tema. */
export function filterInventarisAktif(filter: FilterInventarisPublik): boolean {
  return (
    filter.cari !== "" ||
    filter.kategori !== "" ||
    filter.kondisi !== "" ||
    filter.lokasi !== "" ||
    filter.tahun !== null
  );
}

/** Saring baris inventaris sesuai filter publik (perbandingan tanpa peduli huruf). */
export function saringInventaris<T extends BarisInventarisPublik>(
  rows: readonly T[],
  filter: FilterInventarisPublik,
): T[] {
  const cari = filter.cari.toLowerCase();
  const kategori = filter.kategori.toLowerCase();
  const lokasi = filter.lokasi.toLowerCase();

  return rows.filter((row) => {
    if (kategori && (row.kategoriNama ?? "").toLowerCase() !== kategori) return false;
    if (filter.kondisi && row.kondisi !== filter.kondisi) return false;
    if (lokasi && (row.lokasi ?? "").toLowerCase() !== lokasi) return false;
    if (filter.tahun !== null && row.tahunPembelian !== filter.tahun) return false;

    if (cari) {
      const teksBaris = [row.namaBarang, row.kodeBarang, row.nomorInventaris]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();
      if (!teksBaris.includes(cari)) return false;
    }

    return true;
  });
}

/** Nilai unik untuk pilihan filter, dihitung dari data yang belum disaring. */
export function opsiFilterInventaris(rows: readonly BarisInventarisPublik[]): {
  kategori: string[];
  lokasi: string[];
  tahun: number[];
} {
  const kategori = new Set<string>();
  const lokasi = new Set<string>();
  const tahun = new Set<number>();

  for (const row of rows) {
    const namaKategori = row.kategoriNama?.trim();
    if (namaKategori) kategori.add(namaKategori);
    const namaLokasi = row.lokasi?.trim();
    if (namaLokasi) lokasi.add(namaLokasi);
    if (row.tahunPembelian !== null) tahun.add(row.tahunPembelian);
  }

  return {
    kategori: [...kategori].sort((a, b) => a.localeCompare(b, "id")),
    lokasi: [...lokasi].sort((a, b) => a.localeCompare(b, "id")),
    tahun: [...tahun].sort((a, b) => b - a),
  };
}

/** Tautan ekspor CSV yang membawa filter aktif. */
export function inventarisEksporUrl(filter: FilterInventarisPublik): string {
  const params = new URLSearchParams();
  if (filter.cari) params.set("q", filter.cari);
  if (filter.kategori) params.set("kategori", filter.kategori);
  if (filter.kondisi) params.set("kondisi", filter.kondisi);
  if (filter.lokasi) params.set("lokasi", filter.lokasi);
  if (filter.tahun !== null) params.set("tahun", String(filter.tahun));
  const query = params.toString();
  return query ? `/desa/inventaris/ekspor?${query}` : "/desa/inventaris/ekspor";
}

export const KOLOM_CSV_INVENTARIS = [
  "Nama Barang",
  "Kode",
  "Nomor Inventaris",
  "Kategori",
  "Jumlah",
  "Satuan",
  "Kondisi",
  "Lokasi",
  "Tahun",
  "Nilai",
] as const;

/** Teks CSV inventaris dengan BOM UTF-8 dan akhir baris CRLF. */
export function buildInventarisCsv(rows: readonly BarisInventarisCsv[]): string {
  const baris: string[][] = [
    [...KOLOM_CSV_INVENTARIS],
    ...rows.map((row) => [
      row.namaBarang,
      row.kodeBarang ?? "",
      row.nomorInventaris ?? "",
      row.kategoriNama ?? "",
      row.jumlah,
      row.satuan ?? "",
      INVENTARIS_KONDISI_LABELS[row.kondisi as InventarisKondisi] ?? row.kondisi,
      row.lokasi ?? "",
      row.tahunPembelian === null ? "" : String(row.tahunPembelian),
      row.nilaiAkhir ?? "",
    ]),
  ];

  return `\uFEFF${baris.map((item) => item.map((sel) => csvCell(sel)).join(";")).join("\r\n")}`;
}

/** Nama berkas CSV aman untuk unduhan. */
export function inventarisCsvFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "desa";
  return `inventaris-${slug}.csv`;
}
