import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import type { IdentitasDesa } from "@/features/desa/infrastructure/desa-repository";
import {
  genderLabelKk,
  kepalaKeluarga,
  tanggalKk,
  type KeluargaMemberDetail,
} from "@/features/keluarga/domain/keluarga";

/**
 * Penyusun PDF Kartu Keluarga.
 *
 * Tata letak: judul "KARTU KELUARGA" + "SALINAN" +
 * nomor KK, blok info wilayah, lalu **dua tabel** (kolom 1: identitas dasar;
 * kolom 2: status kawin, hubungan keluarga, kewarganegaraan, nama ayah/ibu) dan
 * blok tanda tangan kepala keluarga serta kepala desa.
 *
 * Orientasi **lanskap** karena KK memuat belasan kolom; A4 potrait akan membuat
 * teks terpotong. Font standar pdf-lib hanya mendukung WinAnsi, jadi seluruh
 * teks dinormalkan lebih dulu lewat `clean`.
 */

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export interface KeluargaPdfInput {
  desa: IdentitasDesa | null;
  nomorKk: string;
  alamat: string | null;
  wilayah: { dusun: string | null; rw: string | null; rt: string | null };
  anggota: readonly KeluargaMemberDetail[];
}

/** Normalkan karakter agar aman dengan font WinAnsi. */
function clean(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

/** Teks sel: nilai atau tanda hubung bila kosong. */
function sel(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return text === "" ? "-" : text;
}

/** Motong teks bila melebihi lebar kolom (tanpa ellipsis berlebih). */
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const value = clean(text);
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;

  let result = value;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}…`, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

interface Column {
  label: string;
  width: number;
  value: (row: KeluargaMemberDetail, index: number) => string;
}

/** Tabel pertama: identitas dasar anggota. */
const KOLOM_SATU: readonly Column[] = [
  { label: "No", width: 20, value: (_row, index) => String(index + 1) },
  { label: "Nama", width: 120, value: (row) => row.name },
  { label: "NIK", width: 86, value: (row) => sel(row.nationalId) },
  { label: "Jenis Kelamin", width: 62, value: (row) => genderLabelKk(row.gender) },
  { label: "Tempat Lahir", width: 84, value: (row) => sel(row.birthPlace) },
  { label: "Tanggal Lahir", width: 68, value: (row) => sel(tanggalKk(row.birthDate)) },
  { label: "Agama", width: 68, value: (row) => sel(row.religionName) },
  { label: "Pendidikan", width: 92, value: (row) => sel(row.educationName) },
  { label: "Pekerjaan", width: 128, value: (row) => sel(row.occupationName) },
  { label: "Gol. Darah", width: 50, value: (row) => sel(row.bloodTypeName) },
];

/** Tabel kedua: status & hubungan keluarga. */
const KOLOM_DUA: readonly Column[] = [
  { label: "No", width: 20, value: (_row, index) => String(index + 1) },
  { label: "Status Perkawinan", width: 120, value: (row) => sel(row.maritalStatusName) },
  { label: "Hubungan Keluarga", width: 140, value: (row) => sel(row.relationName) },
  { label: "Kewarganegaraan", width: 110, value: (row) => sel(row.citizenshipName) },
  { label: "Nama Ayah", width: 160, value: (row) => sel(row.fatherName) },
  { label: "Nama Ibu", width: 160, value: (row) => sel(row.motherName) },
];

const CELL_SIZE = 7;
const LABEL_SIZE = 7.5;
const ROW_HEIGHT = 17;
const HEADER_HEIGHT = 22;

/** Gambar satu tabel; mengembalikan `y` setelah tabel selesai. */
function gambarTabel(
  page: PDFPage,
  y: number,
  font: PDFFont,
  bold: PDFFont,
  judul: string,
  kolom: readonly Column[],
  anggota: readonly KeluargaMemberDetail[],
): number {
  page.drawText(clean(judul), { x: MARGIN, y, size: 9, font: bold });
  y -= 14;

  // Simpan posisi awal kolom agar garis vertikal dapat digambar konsisten.
  const batasX: number[] = [];
  let x = MARGIN;
  for (const kolomItem of kolom) {
    batasX.push(x);
    x += kolomItem.width;
  }
  const tableRight = x;

  // Kepala tabel.
  const headY = y;
  for (const [index, kolomItem] of kolom.entries()) {
    page.drawText(fit(kolomItem.label, bold, LABEL_SIZE, kolomItem.width - 4), {
      x: batasX[index]! + 4,
      y: headY - 11,
      size: LABEL_SIZE,
      font: bold,
    });
  }
  y -= HEADER_HEIGHT;

  for (const [index, row] of anggota.entries()) {
    for (const [kolomIndex, kolomItem] of kolom.entries()) {
      page.drawText(fit(kolomItem.value(row, index), font, CELL_SIZE, kolomItem.width - 4), {
        x: batasX[kolomIndex]! + 4,
        y: y - 11,
        size: CELL_SIZE,
        font,
      });
    }
    y -= ROW_HEIGHT;
  }

  // Garis: tepi atas, bawah kepala, dan bawah tabel, plus pemisah vertikal.
  const top = headY + 6;
  const bottom = y + 6;
  for (const lineY of [top, headY - HEADER_HEIGHT + 8, bottom]) {
    page.drawLine({
      start: { x: MARGIN, y: lineY },
      end: { x: tableRight, y: lineY },
      thickness: lineY === bottom || lineY === top ? 0.8 : 0.5,
      color: rgb(0, 0, 0),
    });
  }
  for (const [index, posX] of batasX.entries()) {
    page.drawLine({
      start: { x: posX, y: top },
      end: { x: posX, y: bottom },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    if (index === batasX.length - 1) {
      page.drawLine({
        start: { x: tableRight, y: top },
        end: { x: tableRight, y: bottom },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }
  }

  return bottom - 26;
}

export async function buildKeluargaPdf(input: KeluargaPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const desa = input.desa;

  // --- Judul ---
  let y = PAGE_HEIGHT - MARGIN;
  const title = "KARTU KELUARGA";
  page.drawText(title, {
    x: (PAGE_WIDTH - bold.widthOfTextAtSize(title, 16)) / 2,
    y: y - 16,
    size: 16,
    font: bold,
  });
  y -= 34;

  const salinan = "SALINAN";
  page.drawText(salinan, {
    x: (PAGE_WIDTH - font.widthOfTextAtSize(salinan, 9)) / 2,
    y,
    size: 9,
    font,
  });
  y -= 14;

  const nomor = `No. ${input.nomorKk}`;
  page.drawText(nomor, {
    x: (PAGE_WIDTH - bold.widthOfTextAtSize(nomor, 11)) / 2,
    y,
    size: 11,
    font: bold,
  });
  y -= 22;

  // --- Blok info (dua kolom berpasangan) ---
  const wilayahText = [
    input.wilayah.dusun ? `Dusun ${input.wilayah.dusun}` : null,
    input.wilayah.rt ? `RT ${input.wilayah.rt}` : null,
    input.wilayah.rw ? `RW ${input.wilayah.rw}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const infoKiri: [string, string][] = [
    ["Nama Kepala Keluarga", clean(kepalaKeluarga(input.anggota)?.name ?? "-")],
    ["Alamat", clean(sel(input.alamat))],
    ["RT / RW", clean(sel([input.wilayah.rt, input.wilayah.rw].filter(Boolean).join(" / ")))],
  ];
  const infoKanan: [string, string][] = [
    ["Desa / Kelurahan", clean(sel(desa?.namaDesa))],
    ["Kecamatan", clean(sel(desa?.namaKecamatan))],
    ["Kabupaten / Kota", clean(sel(desa?.namaKabupaten))],
    ["Provinsi", clean(sel(desa?.namaPropinsi))],
    ["Kode Pos", clean(sel(desa?.kodePos))],
  ];

  const labelWidth = 92;
  const colWidth = CONTENT_WIDTH / 2;
  const infoTop = y;

  infoKiri.forEach(([label, value], index) => {
    const rowY = infoTop - index * 13;
    page.drawText(clean(label), { x: MARGIN, y: rowY, size: 8, font });
    page.drawText(":", { x: MARGIN + labelWidth, y: rowY, size: 8, font });
    page.drawText(fit(value, font, 8, colWidth - labelWidth - 8), {
      x: MARGIN + labelWidth + 6,
      y: rowY,
      size: 8,
      font: bold,
    });
  });

  infoKanan.forEach(([label, value], index) => {
    const rowY = infoTop - index * 13;
    const baseX = MARGIN + colWidth;
    page.drawText(clean(label), { x: baseX, y: rowY, size: 8, font });
    page.drawText(":", { x: baseX + labelWidth, y: rowY, size: 8, font });
    page.drawText(fit(value, font, 8, colWidth - labelWidth - 8), {
      x: baseX + labelWidth + 6,
      y: rowY,
      size: 8,
      font: bold,
    });
  });

  y = infoTop - Math.max(infoKiri.length, infoKanan.length) * 13 - 10;

  if (wilayahText) {
    page.drawText(clean(`Wilayah: ${wilayahText}`), { x: MARGIN, y, size: 8, font });
    y -= 16;
  }

  // --- Tabel ---
  y = gambarTabel(page, y, font, bold, "I. IDENTITAS ANGGOTA KELUARGA", KOLOM_SATU, input.anggota);
  y = gambarTabel(
    page,
    y,
    font,
    bold,
    "II. STATUS, HUBUNGAN, DAN ORANG TUA",
    KOLOM_DUA,
    input.anggota,
  );

  if (input.anggota.length === 0) {
    page.drawText("Belum ada anggota keluarga yang tercatat.", {
      x: MARGIN,
      y: y + 20,
      size: 9,
      font,
    });
  }

  // --- Tanda tangan ---
  const kepala = kepalaKeluarga(input.anggota);
  const ttdY = Math.min(y - 10, MARGIN + 96);
  const leftX = MARGIN + 40;
  const rightX = PAGE_WIDTH - MARGIN - 220;

  page.drawText(clean("KEPALA KELUARGA"), { x: leftX, y: ttdY, size: 9, font: bold });
  page.drawText(clean(kepala?.name ?? "-"), { x: leftX, y: ttdY - 46, size: 9, font: bold });
  page.drawLine({
    start: { x: leftX, y: ttdY - 49 },
    end: {
      x: leftX + Math.max(140, font.widthOfTextAtSize(clean(kepala?.name ?? "-"), 9)),
      y: ttdY - 49,
    },
    thickness: 0.5,
  });

  const jabatan = desa?.namaDesa ? `KEPALA DESA ${desa.namaDesa.toUpperCase()}` : "KEPALA DESA";
  page.drawText(clean(jabatan), { x: rightX, y: ttdY, size: 9, font: bold });
  const namaKades = clean(desa?.namaKepalaDesa ?? "-");
  page.drawText(namaKades, { x: rightX, y: ttdY - 46, size: 9, font: bold });
  page.drawLine({
    start: { x: rightX, y: ttdY - 49 },
    end: {
      x: rightX + Math.max(140, font.widthOfTextAtSize(namaKades, 9)),
      y: ttdY - 49,
    },
    thickness: 0.5,
  });

  return pdf.save();
}
