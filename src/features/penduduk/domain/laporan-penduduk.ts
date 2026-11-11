import type { Gender } from "@/features/penduduk/domain/penduduk";
import { csvCell, toCsv } from "@/lib/csv";

export { csvCell, toCsv };

/**
 * Logika murni untuk laporan kependudukan.
 *
 * Laporan di sini diturunkan **dari data penduduk yang sudah ada** — tidak ada
 * tabel baru. Angka dihitung di lapisan aplikasi agar aturan pengelompokan
 * (kelompok umur, statistik per kategori) dapat diuji tanpa basis data.
 */

// --- Jenis laporan ---------------------------------------------------------

/**
 * Ragam laporan yang disediakan.
 *
 * `umur` & `jenis-kelamin` memakai data penduduk apa adanya, sedangkan
 * `agama`, `pendidikan`, `pekerjaan`, `status-kawin`, dan `wilayah` menghitung
 * sebaran per katalog referensi.
 */
export const LAPORAN_PENDUDUK_JENIS = [
  "umur",
  "jenis-kelamin",
  "agama",
  "pendidikan",
  "pekerjaan",
  "status-kawin",
  "wilayah",
  "kelompok-umur",
] as const;

export type LaporanPendudukJenis = (typeof LAPORAN_PENDUDUK_JENIS)[number];

export const LAPORAN_PENDUDUK_OPTIONS: readonly {
  value: LaporanPendudukJenis;
  label: string;
  deskripsi: string;
}[] = [
  {
    value: "umur",
    label: "Menurut Umur",
    deskripsi: "Sebaran penduduk per kelompok umur.",
  },
  {
    value: "jenis-kelamin",
    label: "Menurut Jenis Kelamin",
    deskripsi: "Jumlah laki-laki, perempuan, dan total.",
  },
  {
    value: "agama",
    label: "Menurut Agama",
    deskripsi: "Sebaran penduduk per agama.",
  },
  {
    value: "pendidikan",
    label: "Menurut Pendidikan",
    deskripsi: "Sebaran penduduk per pendidikan terakhir.",
  },
  {
    value: "pekerjaan",
    label: "Menurut Pekerjaan",
    deskripsi: "Sebaran penduduk per pekerjaan.",
  },
  {
    value: "status-kawin",
    label: "Menurut Status Kawin",
    deskripsi: "Sebaran penduduk per status perkawinan.",
  },
  {
    value: "wilayah",
    label: "Menurut Wilayah",
    deskripsi: "Sebaran penduduk per dusun/RW/RT.",
  },
  {
    value: "kelompok-umur",
    label: "Kelompok Umur (Rentan)",
    deskripsi: "Pilah umur sesuai Data Pilah Kependudukan.",
  },
];

/** Label manusiawi sebuah jenis laporan, mis. "Menurut Agama". */
export function laporanPendudukLabel(jenis: string): string {
  return LAPORAN_PENDUDUK_OPTIONS.find((item) => item.value === jenis)?.label ?? jenis;
}

/**
 * Label siap pakai di tengah kalimat "…menurut <label>".
 *
 * Label pilihan sudah memuat kata "Menurut", sehingga menyisipkannya ke
 * kalimat bertemplat akan menghasilkan "Menurut Menurut Agama". Fungsi ini
 * melepas awalan tersebut agar judul terbaca wajar.
 */
export function laporanPendudukKategori(jenis: string): string {
  return laporanPendudukLabel(jenis).replace(/^Menurut\s+/i, "");
}

/** Apakah nilai bertipe jenis laporan yang dikenal? */
export function isLaporanPendudukJenis(value: string): value is LaporanPendudukJenis {
  return (LAPORAN_PENDUDUK_JENIS as readonly string[]).includes(value);
}

// --- Kelompok umur ---------------------------------------------------------

/**
 * Rentang umur untuk Data Pilah Kependudukan.
 *
 * Data Pilah menurut umur: batas atas inklusif
 * dan `max: null` berarti tanpa batas atas. Satu penduduk masuk **tepat satu**
 * kelompok karena rentangnya tidak bertumpang.
 */
export interface KelompokUmur {
  kode: string;
  label: string;
  min: number;
  max: number | null;
}

export const KELOMPOK_UMUR: readonly KelompokUmur[] = [
  { kode: "0-0", label: "Di bawah 1 Tahun", min: 0, max: 0 },
  { kode: "1-5", label: "1–5 Tahun", min: 1, max: 5 },
  { kode: "6-12", label: "6–12 Tahun", min: 6, max: 12 },
  { kode: "13-15", label: "13–15 Tahun", min: 13, max: 15 },
  { kode: "16-18", label: "16–18 Tahun", min: 16, max: 18 },
  { kode: "19-24", label: "19–24 Tahun", min: 19, max: 24 },
  { kode: "25-59", label: "25–59 Tahun", min: 25, max: 59 },
  { kode: "60+", label: "Di atas 60 Tahun", min: 60, max: null },
];

/** Kelompok umur yang memuat `umur`, atau `null` bila umur tidak diketahui. */
export function kelompokUmurUntuk(umur: number | null): KelompokUmur | null {
  if (umur === null || umur < 0) return null;

  return (
    KELOMPOK_UMUR.find(
      (kelompok) => umur >= kelompok.min && (kelompok.max === null || umur <= kelompok.max),
    ) ?? null
  );
}

// --- Statistik sebaran -----------------------------------------------------

/** Satu baris statistik: label kategori dengan hitungan gender. */
export interface StatistikBaris {
  label: string;
  lakiLaki: number;
  perempuan: number;
  jumlah: number;
}

/** Ringkasan total seluruh penduduk aktif. */
export interface StatistikTotal {
  lakiLaki: number;
  perempuan: number;
  jumlah: number;
  /** Jumlah penduduk yang tidak punya data kategori (mis. agama kosong). */
  tanpaKategori: number;
}

export interface StatistikKependudukan {
  baris: StatistikBaris[];
  total: StatistikTotal;
}

/** Satu penduduk yang sudah dinormalisasi untuk keperluan statistik. */
export interface PendudukStatistik {
  gender: Gender;
  umur: number | null;
  agama: string | null;
  pendidikan: string | null;
  pekerjaan: string | null;
  statusKawin: string | null;
  wilayah: string | null;
}

const TANPA_KATEGORI = "Belum Diisi";

/**
 * Hitung sebaran penduduk per kategori.
 *
 * `ambilKategori` menentukan nilai kategori sebuah penduduk; nilai kosong
 * dikelompokkan sebagai "Belum Diisi" agar totalnya selalu utuh. Baris
 * diurutkan menurun berdasarkan jumlah (kategori terbesar di atas), lalu
 * menurut label agar urutannya stabil antar pemanggilan.
 */
export function hitungSebaran(
  penduduk: readonly PendudukStatistik[],
  ambilKategori: (row: PendudukStatistik) => string | null,
): StatistikKependudukan {
  const peta = new Map<string, { lakiLaki: number; perempuan: number }>();

  let lakiLaki = 0;
  let perempuan = 0;
  let tanpaKategori = 0;

  for (const row of penduduk) {
    if (row.gender === "male") lakiLaki += 1;
    else perempuan += 1;

    const kategori = (ambilKategori(row) ?? "").trim();
    if (kategori === "") {
      tanpaKategori += 1;
      continue;
    }

    const isi = peta.get(kategori) ?? { lakiLaki: 0, perempuan: 0 };
    if (row.gender === "male") isi.lakiLaki += 1;
    else isi.perempuan += 1;
    peta.set(kategori, isi);
  }

  const baris: StatistikBaris[] = [...peta.entries()]
    .map(([label, isi]) => ({
      label,
      lakiLaki: isi.lakiLaki,
      perempuan: isi.perempuan,
      jumlah: isi.lakiLaki + isi.perempuan,
    }))
    .sort((a, b) => b.jumlah - a.jumlah || a.label.localeCompare(b.label, "id"));

  if (tanpaKategori > 0) {
    baris.push({ label: TANPA_KATEGORI, lakiLaki: 0, perempuan: 0, jumlah: 0 });
  }

  return {
    baris,
    total: { lakiLaki, perempuan, jumlah: lakiLaki + perempuan, tanpaKategori },
  };
}

/** Sebaran penduduk per kelompok umur (Data Pilah). */
export function hitungKelompokUmur(penduduk: readonly PendudukStatistik[]): StatistikKependudukan {
  const peta = new Map<string, { lakiLaki: number; perempuan: number }>();
  for (const kelompok of KELOMPOK_UMUR) {
    peta.set(kelompok.label, { lakiLaki: 0, perempuan: 0 });
  }

  let lakiLaki = 0;
  let perempuan = 0;
  let tanpaKategori = 0;

  for (const row of penduduk) {
    if (row.gender === "male") lakiLaki += 1;
    else perempuan += 1;

    const kelompok = kelompokUmurUntuk(row.umur);
    if (!kelompok) {
      tanpaKategori += 1;
      continue;
    }

    const isi = peta.get(kelompok.label);
    if (!isi) continue;

    if (row.gender === "male") isi.lakiLaki += 1;
    else isi.perempuan += 1;
  }

  const baris: StatistikBaris[] = KELOMPOK_UMUR.map((kelompok) => {
    const isi = peta.get(kelompok.label) ?? { lakiLaki: 0, perempuan: 0 };
    return {
      label: kelompok.label,
      lakiLaki: isi.lakiLaki,
      perempuan: isi.perempuan,
      jumlah: isi.lakiLaki + isi.perempuan,
    };
  });

  return {
    baris,
    total: { lakiLaki, perempuan, jumlah: lakiLaki + perempuan, tanpaKategori },
  };
}

/** Sebaran penduduk menurut jenis kelamin (dua baris tetap). */
export function hitungJenisKelamin(penduduk: readonly PendudukStatistik[]): StatistikKependudukan {
  const lakiLaki = penduduk.filter((row) => row.gender === "male").length;
  const perempuan = penduduk.length - lakiLaki;

  return {
    baris: [
      { label: "Laki-laki", lakiLaki, perempuan: 0, jumlah: lakiLaki },
      { label: "Perempuan", lakiLaki: 0, perempuan, jumlah: perempuan },
    ],
    total: {
      lakiLaki,
      perempuan,
      jumlah: penduduk.length,
      tanpaKategori: 0,
    },
  };
}

/** Ambil statistik sesuai jenis laporan yang diminta. */
export function hitungLaporanPenduduk(
  jenis: LaporanPendudukJenis,
  penduduk: readonly PendudukStatistik[],
): StatistikKependudukan {
  switch (jenis) {
    case "jenis-kelamin":
      return hitungJenisKelamin(penduduk);
    case "kelompok-umur":
      return hitungKelompokUmur(penduduk);
    case "agama":
      return hitungSebaran(penduduk, (row) => row.agama);
    case "pendidikan":
      return hitungSebaran(penduduk, (row) => row.pendidikan);
    case "pekerjaan":
      return hitungSebaran(penduduk, (row) => row.pekerjaan);
    case "status-kawin":
      return hitungSebaran(penduduk, (row) => row.statusKawin);
    case "wilayah":
      return hitungSebaran(penduduk, (row) => row.wilayah);
    case "umur":
      return hitungSebaran(penduduk, (row) => (row.umur === null ? null : `${row.umur} tahun`));
  }
}

// --- Ekspor CSV ------------------------------------------------------------

export interface LaporanPendudukCsvInput {
  namaDesa: string | null;
  kecamatan: string | null;
  jenis: LaporanPendudukJenis;
  statistik: StatistikKependudukan;
}

/**
 * Teks CSV laporan kependudukan.
 *
 * Dipisah `;` dengan BOM agar Excel berlokal Indonesia membukanya benar, dan
 * angka ditulis polos supaya dapat dijumlahkan di lembar kerja.
 */
export function buildLaporanPendudukCsv(input: LaporanPendudukCsvInput): string {
  const rows: string[][] = [
    [`Laporan Kependudukan — Menurut ${laporanPendudukKategori(input.jenis)}`],
    ["Desa", input.namaDesa ?? "-", "Kecamatan", input.kecamatan ?? "-"],
    [],
    ["Kategori", "Laki-laki", "Perempuan", "Jumlah"],
    ...input.statistik.baris.map((row) => [
      row.label,
      String(row.lakiLaki),
      String(row.perempuan),
      String(row.jumlah),
    ]),
    [
      "Jumlah",
      String(input.statistik.total.lakiLaki),
      String(input.statistik.total.perempuan),
      String(input.statistik.total.jumlah),
    ],
  ];

  if (input.statistik.total.tanpaKategori > 0) {
    rows.push([], ["Tanpa kategori", String(input.statistik.total.tanpaKategori)]);
  }

  return `\uFEFF${toCsv(rows)}`;
}

/** Nama berkas aman untuk unduhan. */
export function laporanPendudukFilename(
  namaDesa: string | null,
  jenis: LaporanPendudukJenis,
): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `laporan-penduduk-${jenis}-${slug}.csv`;
}
