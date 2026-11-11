/**
 * CSV statistik publik.
 *
 * Statistik yang tampil di `/desa/statistik` juga dapat diunduh warga sebagai
 * CSV. Isinya **hanya** ringkasan yang sudah dipublikasikan halaman — tidak ada
 * data pribadi penduduk. Pemisah titik koma dipakai agar ramah Excel Indonesia,
 * dan sel dibungkus agar formula tidak dieksekusi saat berkas dibuka.
 */

/** Bentuk data yang dibutuhkan pembuat CSV (subset `StatistikPublik`). */
export interface StatistikPublikCsv {
  total: number;
  lakiLaki: number;
  perempuan: number;
  keluarga: number;
  perDusun: { label: string; total: number }[];
  bantuan: { program: number; peserta: number };
  keuangan: {
    tahun: number;
    pendapatan: string;
    belanja: string;
    realisasiBelanja: string;
  };
  periode: { triwulan: number; label: string; realisasi: string; persen: number }[];
}

export const KOLOM_CSV_STATISTIK = ["Kategori", "Keterangan", "Nilai"] as const;

/** Cegah formula injection saat CSV dibuka di Excel. */
function amanFormula(value: string): string {
  if (!/^[=+\-@]/.test(value)) return value;
  return `'${value}`;
}

/** Bungkus sel CSV; pemisah titik koma agar ramah Excel Indonesia. */
export function csvCellStatistik(value: string): string {
  const teksSel = amanFormula(value);
  const perluKutip =
    teksSel.includes(";") ||
    teksSel.includes('"') ||
    teksSel.includes("\n") ||
    teksSel.includes("\r");
  if (!perluKutip) return teksSel;
  return `"${teksSel.replace(/"/g, '""')}"`;
}

/** Teks CSV statistik dengan BOM UTF-8 dan akhir baris CRLF. */
export function buildStatistikPublikCsv(statistik: StatistikPublikCsv): string {
  const baris: string[][] = [
    [...KOLOM_CSV_STATISTIK],
    ["Ringkasan", "Total penduduk", String(statistik.total)],
    ["Ringkasan", "Laki-laki", String(statistik.lakiLaki)],
    ["Ringkasan", "Perempuan", String(statistik.perempuan)],
    ["Ringkasan", "Kartu keluarga", String(statistik.keluarga)],
    ...statistik.perDusun.map((row) => ["Sebaran per dusun", row.label, String(row.total)]),
    ["Bantuan", "Program bantuan", String(statistik.bantuan.program)],
    ["Bantuan", "Peserta bantuan", String(statistik.bantuan.peserta)],
    ["Keuangan", `Pendapatan ${statistik.keuangan.tahun}`, statistik.keuangan.pendapatan],
    ["Keuangan", `Belanja ${statistik.keuangan.tahun}`, statistik.keuangan.belanja],
    [
      "Keuangan",
      `Realisasi belanja ${statistik.keuangan.tahun}`,
      statistik.keuangan.realisasiBelanja,
    ],
    ...statistik.periode.map((row) => [
      "Realisasi triwulan",
      row.label,
      `${row.realisasi} (${row.persen.toFixed(1)}%)`,
    ]),
  ];

  return `\uFEFF${baris.map((item) => item.map(csvCellStatistik).join(";")).join("\r\n")}`;
}

/** Nama berkas CSV aman untuk unduhan. */
export function statistikPublikCsvFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "desa";
  return `statistik-${slug}.csv`;
}
