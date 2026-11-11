import { z } from "zod";

import { formatMoney, toMinor, totalLaporan, type RpApbdBaris, type RpApbdTotal } from "./keuangan";

/**
 * Laporan APBDes **sebagai dokumen** (Lapis D pada sistem rujukan).
 *
 * Berbeda dari RP APBDes yang dihitung dari pohon rekening, lapis ini tidak
 * menurunkan angka apa pun: operator menyusun/mengunggah sendiri dokumen
 * laporan per semester, lalu mencatat tanggal penyerahannya. Karena itu
 * modulnya adalah **arsip dokumen**, bukan pembangkit laporan.
 */

/** Jenis dokumen laporan yang dikenal. */
export const LAPORAN_TIPE = {
  apbdes: "laporan_apbdes",
  penduduk: "laporan_penduduk",
} as const;

export type LaporanTipe = (typeof LAPORAN_TIPE)[keyof typeof LAPORAN_TIPE];

export const LAPORAN_TIPE_OPTIONS: readonly { value: LaporanTipe; label: string }[] = [
  { value: LAPORAN_TIPE.apbdes, label: "Laporan APBDes" },
  { value: LAPORAN_TIPE.penduduk, label: "Laporan Penduduk" },
];

export function laporanTipeLabel(tipe: string): string {
  return LAPORAN_TIPE_OPTIONS.find((item) => item.value === tipe)?.label ?? tipe;
}

/** Semester laporan; `1` = Januari–Juni, `2` = Juli–Desember. */
export const SEMESTER_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: "Semester I (Januari–Juni)" },
  { value: 2, label: "Semester II (Juli–Desember)" },
];

export function semesterLabel(semester: number): string {
  return semester === 2 ? "Semester II" : semester === 1 ? "Semester I" : `Semester ${semester}`;
}

// --- Skema formulir --------------------------------------------------------

/**
 * Skema metadata laporan.
 *
 * Berkas dipilih terpisah karena `File` tidak dapat diparse ulang setelah
 * dibaca; validasi berkas dilakukan manual di use-case agar pesannya jelas.
 */
export const laporanDokumenFormSchema = z.object({
  tipe: z.enum([LAPORAN_TIPE.apbdes, LAPORAN_TIPE.penduduk], {
    message: "Jenis laporan wajib dipilih.",
  }),
  judul: z.string().trim().min(3, "Judul minimal 3 karakter.").max(255),
  tahun: z.coerce
    .number()
    .int("Tahun harus bilangan bulat.")
    .min(2000, "Tahun di luar rentang wajar.")
    .max(2100, "Tahun di luar rentang wajar."),
  semester: z.coerce
    .number()
    .int("Semester harus bilangan bulat.")
    .refine((value) => value === 1 || value === 2, "Semester hanya 1 atau 2."),
});

export type LaporanDokumenInput = z.infer<typeof laporanDokumenFormSchema>;

// --- Metadata berkas -------------------------------------------------------

export const MAKS_UKURAN_BERKAS = 8 * 1024 * 1024;

/** Ekstensi & tipe MIME yang diterima. Hanya PDF — laporan resmi berstempel. */
export const PDF_MIME = "application/pdf";

export interface BerkasLaporan {
  nama: string;
  ukuran: number;
  tipe: string;
}

/**
 * Validasi berkas laporan.
 *
 * Mengembalikan pesan kesalahan dalam bahasa Indonesia, atau `null` bila sah.
 * Dipisah dari skema Zod agar dapat diuji tanpa `File`/FormData.
 */
export function validasiBerkasLaporan(berkas: BerkasLaporan | null): string | null {
  if (!berkas) return "Berkas laporan wajib dipilih.";
  if (berkas.ukuran <= 0) return "Berkas laporan kosong.";
  if (berkas.ukuran > MAKS_UKURAN_BERKAS) return "Ukuran berkas maksimal 8 MB.";
  if (berkas.tipe !== PDF_MIME) return "Berkas laporan harus berformat PDF.";
  if (!/\.pdf$/i.test(berkas.nama)) return "Berkas laporan harus berekstensi .pdf.";
  return null;
}

/** Nama berkas aman untuk disimpan di disk (tanpa karakter berbahaya). */
export function berkasLaporanAman(nama: string): string {
  const base = nama.replace(/\.pdf$/i, "");
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "laporan";
  return `${slug}.pdf`;
}

// --- Baris laporan (tampilan) ---------------------------------------------

export interface LaporanDokumenRow {
  id: number;
  tipe: string;
  tipeLabel: string;
  judul: string;
  tahun: number;
  semester: number;
  semesterLabel: string;
  namaFile: string;
  /** Tanggal dokumen diserahkan (ISO), `null` bila belum diserahkan. */
  diserahkanPada: string | null;
  dibuatPada: string;
}

// --- Rangkuman periode -----------------------------------------------------

export interface LaporanPeriode {
  /** Jumlah dokumen yang sudah diunggah. */
  jumlahDokumen: number;
  /** Pasangan semester yang sudah tercatat (mis. `["2026-S1"]`). */
  tercatat: string[];
  /** Pesan kelengkapan; `null` bila periode sudah lengkap. */
  belumLengkap: string | null;
}

/** Apakah dokumen ini sudah diserahkan? */
export function sudahDiserahkan(diserahkanPada: string | null): boolean {
  return diserahkanPada !== null && diserahkanPada.trim() !== "";
}

/**
 * Ubah input `<input type="date">` menjadi cap waktu ISO.
 *
 * Tanggal dipatok ke pukul 12.00 UTC agar tanggal lokal di Indonesia
 * (UTC+7/8/9) tidak bergeser menjadi hari sebelumnya.
 */
export function tanggalPenyerahan(value: string): string | null {
  const bersih = value.trim();
  if (bersih === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bersih)) return null;

  const tanggal = new Date(`${bersih}T12:00:00.000Z`);
  return Number.isNaN(tanggal.getTime()) ? null : tanggal.toISOString();
}

/** Format tanggal penyerahan untuk `<input type="date">` (`YYYY-MM-DD`). */
export function tanggalUntukInput(diserahkanPada: string | null): string {
  if (!diserahkanPada) return "";
  const tanggal = new Date(diserahkanPada);
  return Number.isNaN(tanggal.getTime()) ? "" : tanggal.toISOString().slice(0, 10);
}

/**
 * Rangkum kelengkapan dokumen laporan sebuah tahun.
 *
 * Sistem rujukan mengirim laporan **per semester**, jadi satu tahun dianggap
 * lengkap bila semester I & II sama-sama ada. Dipakai sebagai peringatan
 * lunak di UI — bukan penghalang menyimpan.
 */
export function rangkumPeriode(rows: readonly LaporanDokumenRow[], tahun: number): LaporanPeriode {
  const periode = rows
    .filter((row) => row.tahun === tahun)
    .map((row) => `${row.tahun}-S${row.semester}`);

  const unik = [...new Set(periode)].sort();
  const kurang: string[] = [];
  if (!unik.includes(`${tahun}-S1`)) kurang.push("Semester I");
  if (!unik.includes(`${tahun}-S2`)) kurang.push("Semester II");

  return {
    jumlahDokumen: rows.filter((row) => row.tahun === tahun).length,
    tercatat: unik,
    belumLengkap: kurang.length > 0 ? `Belum ada dokumen ${kurang.join(" dan ")}.` : null,
  };
}

// --- Ekspor Excel (SpreadsheetML) -----------------------------------------

/**
 * Bungkus teks agar aman dipakai sebagai isi sel XML.
 *
 * `&` harus diganti lebih dulu supaya entitas yang kita hasilkan tidak
 * ter-escape dua kali.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Sel bertipe teks. */
export function selTeks(value: string): string {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

/** Sel bertipe angka; nilai desimal polos agar dapat dijumlahkan Excel. */
export function selAngka(value: string): string {
  return `<Cell><Data ss:Type="Number">${escapeXml(formatMoney(toMinor(value)))}</Data></Cell>`;
}

export interface LaporanExcelInput {
  namaDesa: string | null;
  kecamatan: string | null;
  tahun: number;
  baris: readonly RpApbdBaris[];
  total: RpApbdTotal;
  bidang: readonly RpApbdBaris[];
  totalBidang: RpApbdTotal;
}

function barisLaporan(row: RpApbdBaris): string {
  return `<Row>${[
    selTeks(row.kode),
    selTeks(row.uraian),
    selAngka(row.anggaran),
    selAngka(row.realisasi),
    selAngka(row.selisih),
    selAngka(row.persen.toFixed(2)),
  ].join("")}</Row>`;
}

function barisJumlah(total: RpApbdTotal): string {
  return `<Row>${[
    selTeks(""),
    selTeks("Jumlah"),
    selAngka(total.anggaran),
    selAngka(total.realisasi),
    selAngka(total.selisih),
    selTeks(""),
  ].join("")}</Row>`;
}

function barisJudul(nilai: string): string {
  return `<Row>${selTeks(nilai)}</Row>`;
}

const BARIS_KEPALA = `<Row>${["Kode", "Uraian", "Anggaran", "Realisasi", "Selisih", "%"].map(selTeks).join("")}</Row>`;

/**
 * Susun berkas **Excel 2003 XML (SpreadsheetML)** untuk laporan APBDes.
 *
 * Format ini dipilih karena dapat dibuka Excel/LibreOffice sebagai `.xls`
 * sejati (angka tetap bertipe numerik dan dapat dijumlahkan) **tanpa
 * dependensi pustaka baru** — penting agar rantai pasok tetap ramping.
 */
export function buildLaporanExcel(input: LaporanExcelInput): string {
  const rows: string[] = [
    barisJudul("Laporan Realisasi Pelaksanaan APBDes"),
    `<Row>${[
      selTeks("Desa"),
      selTeks(input.namaDesa ?? "-"),
      selTeks("Kecamatan"),
      selTeks(input.kecamatan ?? "-"),
      selTeks("Tahun Anggaran"),
      selTeks(String(input.tahun)),
    ].join("")}</Row>`,
    `<Row>${selTeks("")}</Row>`,
    barisJudul("RP APBDes"),
    BARIS_KEPALA,
    ...input.baris.map(barisLaporan),
    barisJumlah(input.total),
    `<Row>${selTeks("")}</Row>`,
    barisJudul("Realisasi Belanja per Bidang"),
    BARIS_KEPALA,
    ...input.bidang.map(barisLaporan),
    barisJumlah(input.totalBidang),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Laporan APBDes"><Table>',
    ...rows,
    "</Table></Worksheet></Workbook>",
  ].join("");
}

/** Nama berkas Excel aman untuk unduhan. */
export function laporanExcelFilename(namaDesa: string | null, tahun: number): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `laporan-apbdes-${slug}-${tahun}.xls`;
}

/** Total laporan dari sekumpulan baris (re-export untuk kenyamanan pemanggil). */
export { totalLaporan };
