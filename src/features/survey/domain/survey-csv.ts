import {
  validasiJawaban,
  type JawabanRow,
  type RespondenRow,
  type SoalRow,
} from "@/features/survey/domain/survey";
import { CSV_SEPARATOR, csvCell, toCsv } from "@/lib/csv";

export { csvCell, toCsv };
/**
 * Ekspor & impor respons survei lewat CSV.
 *
 * Berkas ini murni (tanpa I/O) agar penulisan/pembacaan CSV dapat diuji tanpa
 * basis data. Format dipilih agar bisa dibuka Excel/LibreOffice/Google Sheets:
 * pemisah `;`, BOM UTF-8, dan kolom jawaban mengikuti **urutan soal** (bukan
 * id soal) supaya berkas tetap terbaca manusia.
 *
 * Urutan kolom: `Nama;NIK;Tanggal;<jawaban soal 1>;<jawaban soal 2>;...`
 * Kolom `Tanggal` hanya informasi saat ekspor; saat impor tanggal dibuat server.
 */

const SEPARATOR = CSV_SEPARATOR;

/** Batas baris data per impor agar satu unggahan tidak membanjiri basis data. */
export const MAKS_BARIS_IMPOR = 2000;

/** Batas ukuran teks CSV yang diterima Server Action (2 MB). */
export const MAKS_UKURAN_CSV = 2 * 1024 * 1024;

/** Kolom identitas tetap di awal berkas. */
export const KOLOM_AWAL = ["Nama", "NIK", "Tanggal"] as const;

function tanggalCsv(value: Date | null): string {
  if (!value) return "";
  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return "";

  const bulan = String(tanggal.getMonth() + 1).padStart(2, "0");
  const hari = String(tanggal.getDate()).padStart(2, "0");
  return `${tanggal.getFullYear()}-${bulan}-${hari}`;
}

export interface SurveyCsvInput {
  soal: readonly SoalRow[];
  responden: readonly RespondenRow[];
  jawaban: readonly JawabanRow[];
}

/**
 * Teks CSV respons survei.
 *
 * NIK diberi awalan apostrof (`'`) agar Excel memperlakukannya sebagai teks —
 * tanpa itu 16 digit berubah menjadi notasi ilmiah dan digit terakhir hilang.
 * Impor memahami awalan tersebut.
 */
export function buildSurveyCsv(input: SurveyCsvInput): string {
  const jawabanPer = new Map<string, string>();
  for (const item of input.jawaban) {
    jawabanPer.set(`${item.respondenId}:${item.soalId}`, item.jawaban);
  }

  const header = [...KOLOM_AWAL, ...input.soal.map((item) => item.pertanyaan)];

  const rows: string[][] = [
    header,
    ...input.responden.map((responden) => [
      responden.nama ?? "",
      responden.nik ? `'${responden.nik}` : "",
      tanggalCsv(responden.createdAt),
      ...input.soal.map((item) => jawabanPer.get(`${responden.id}:${item.id}`) ?? ""),
    ]),
  ];

  return `\uFEFF${toCsv(rows)}`;
}

/**
 * Parser CSV sederhana (RFC 4180): mendukung kutip ganda, `""` sebagai kutip
 * literal, pemisah `;`, serta akhir baris `\r\n`/`\n`, dan membuang BOM.
 * Baris kosong di akhir berkas diabaikan.
 */
export function parseCsv(text: string): string[][] {
  const sumber = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let dalamKutip = false;

  for (let i = 0; i < sumber.length; i += 1) {
    const char = sumber[i];

    if (dalamKutip) {
      if (char === '"') {
        if (sumber[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          dalamKutip = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell === "") {
      dalamKutip = true;
    } else if (char === SEPARATOR) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && sumber[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // Sel/baris terakhir tanpa penutup baris.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.some((sel) => sel.trim() !== ""));
}

/** Normalisasi isi sel: buang BOM/spasi dan awalan teks Excel. */
function bersihkanSel(value: string | undefined): string {
  const teks = (value ?? "").replace(/\uFEFF/g, "").trim();
  // `'=...`/`'+...` berasal dari pelindung formula saat ekspor.
  if (teks.startsWith("'") && /^[=+\-@]/.test(teks.slice(1))) return teks.slice(1);
  // `="..."` adalah trik teks Excel untuk nilai panjang (mis. NIK).
  const formulaTeks = /^="(.*)"$/.exec(teks);
  if (formulaTeks) return formulaTeks[1] ?? "";
  return teks;
}

/** NIK: hanya digit; kosong berarti tanpa NIK. */
export function normalisasiNikCsv(value: string): string | null {
  const digit = value.replace(/\D/g, "");
  return digit === "" ? null : digit;
}

export interface BarisImporSurvei {
  /** Nomor baris pada berkas (baris pertama = 1, termasuk header). */
  baris: number;
  nama: string;
  nik: string | null;
  /** Peta `soalId → jawaban` yang sudah lolos validasi. */
  jawaban: Record<string, string>;
}

export interface KesalahanImporSurvei {
  baris: number;
  pesan: string;
}

export interface HasilParseSurveiCsv {
  baris: BarisImporSurvei[];
  kesalahan: KesalahanImporSurvei[];
}

function tampakHeader(sel: readonly string[]): boolean {
  return (sel[0] ?? "").trim().toLowerCase() === "nama";
}

/**
 * Baca CSV respons survei secara **posisional**: kolom ke-4 dan seterusnya
 * adalah jawaban untuk soal ke-1, ke-2, ... sesuai urutan soal saat ini.
 *
 * Baris yang gagal divalidasi tidak membatalkan baris lain; kegagalannya
 * dilaporkan agar operator dapat memperbaiki berkas lalu mengimpor ulang.
 */
export function parseSurveyCsv(
  text: string,
  soal: readonly Pick<SoalRow, "id" | "tipe" | "pilihan">[],
): HasilParseSurveiCsv {
  const rows = parseCsv(text);
  const hasil: HasilParseSurveiCsv = { baris: [], kesalahan: [] };
  if (rows.length === 0) return hasil;

  const mulai = tampakHeader(rows[0] ?? []) ? 1 : 0;
  const data = rows.slice(mulai).filter((row) => row.some((sel) => sel.trim() !== ""));

  if (data.length > MAKS_BARIS_IMPOR) {
    hasil.kesalahan.push({
      baris: 0,
      pesan: `Berkas memuat ${data.length} baris; maksimal ${MAKS_BARIS_IMPOR} baris per impor.`,
    });
    return hasil;
  }

  data.forEach((row, index) => {
    const nomorBaris = index + mulai + 1;
    const nama = bersihkanSel(row[0]);
    const nikRaw = bersihkanSel(row[1]);
    const nik = normalisasiNikCsv(nikRaw);

    if (nama === "") {
      hasil.kesalahan.push({ baris: nomorBaris, pesan: "Nama wajib diisi." });
      return;
    }
    if (nikRaw !== "" && (nik === null || nik.length !== 16)) {
      hasil.kesalahan.push({
        baris: nomorBaris,
        pesan: "NIK harus 16 angka (atau kosongkan).",
      });
      return;
    }

    const jawaban: Record<string, string> = {};
    soal.forEach((item, kolom) => {
      jawaban[String(item.id)] = bersihkanSel(row[kolom + KOLOM_AWAL.length]);
    });

    const galat = validasiJawaban(soal, jawaban);
    const kunci = Object.keys(galat);
    if (kunci.length > 0) {
      const rincian = kunci
        .map((soalId) => {
          const posisi = soal.findIndex((item) => String(item.id) === soalId);
          return `soal ${posisi + 1}: ${galat[soalId]}`;
        })
        .join("; ");
      hasil.kesalahan.push({ baris: nomorBaris, pesan: `Jawaban tidak valid — ${rincian}.` });
      return;
    }

    hasil.baris.push({ baris: nomorBaris, nama, nik, jawaban });
  });

  return hasil;
}

/** Nama berkas CSV aman untuk unduhan. */
export function surveyCsvFilename(judul: string, id: number): string {
  const slug =
    judul
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "survei";
  return `respons-survei-${slug}-${id}.csv`;
}
