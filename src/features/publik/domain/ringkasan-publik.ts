import { formatMoney, sumMoney, toMinor } from "@/features/keuangan/domain/keuangan";

/**
 * Ringkasan data publik yang dipakai beberapa halaman tema.
 *
 * Fungsi di sini murni (tanpa I/O) agar dapat diuji tanpa basis data. Halaman
 * hanya memetakan baris repository ke bentuk ini, lalu tema menampilkannya.
 */

export interface BarisInventarisPublik {
  kategoriNama: string | null;
  jumlah: string;
  nilaiAkhir: string | null;
  kondisi: string;
}

export interface RekapKategoriInventaris {
  nama: string;
  jumlah: number;
  unit: string;
  nilai: string;
}

export interface RekapInventaris {
  jumlahBarang: number;
  totalUnit: string;
  totalNilai: string;
  perKategori: RekapKategoriInventaris[];
  perKondisi: { kondisi: string; jumlah: number }[];
}

/** Ubah jumlah desimal menjadi label ringkas tanpa nol di belakang koma. */
export function formatJumlah(value: string | null | undefined): string {
  const angka = Number(value ?? 0);
  if (!Number.isFinite(angka)) return "0";
  return angka.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/**
 * Rekap inventaris desa untuk halaman publik.
 *
 * Baris yang masuk dianggap sudah difilter `is_deleted = false` oleh repository.
 * Pengelompokan kategori memakai nama yang sudah di-join; baris tanpa kategori
 * dikelompokkan sebagai "Tanpa kategori" agar tidak hilang dari ringkasan.
 */
export function rekapInventaris(rows: readonly BarisInventarisPublik[]): RekapInventaris {
  const kategori = new Map<string, { jumlah: number; unit: string[]; nilai: string[] }>();
  const kondisi = new Map<string, number>();

  for (const row of rows) {
    const nama = row.kategoriNama?.trim() || "Tanpa kategori";
    const current = kategori.get(nama) ?? { jumlah: 0, unit: [], nilai: [] };
    current.jumlah += 1;
    current.unit.push(row.jumlah);
    current.nilai.push(row.nilaiAkhir ?? "0.00");
    kategori.set(nama, current);

    const label = row.kondisi || "tidak_diketahui";
    kondisi.set(label, (kondisi.get(label) ?? 0) + 1);
  }

  const perKategori = [...kategori.entries()]
    .map(([nama, value]) => ({
      nama,
      jumlah: value.jumlah,
      unit: sumMoney(value.unit),
      nilai: formatMoney(value.nilai.reduce((total, item) => total + toMinor(item), 0n)),
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  const perKondisi = [...kondisi.entries()]
    .map(([label, jumlah]) => ({ kondisi: label, jumlah }))
    .sort((a, b) => a.kondisi.localeCompare(b.kondisi, "id"));

  return {
    jumlahBarang: rows.length,
    totalUnit: sumMoney(rows.map((row) => row.jumlah)),
    totalNilai: formatMoney(
      rows.reduce((total, row) => total + toMinor(row.nilaiAkhir ?? "0.00"), 0n),
    ),
    perKategori,
    perKondisi,
  };
}
