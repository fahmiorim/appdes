import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { toBuffer as qrToBuffer } from "qrcode";

import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { formatTanggalIndonesia } from "@/features/surat/domain/surat";

export interface SuratPdfIdentity {
  namaDesa: string | null;
  kodeDesa: string | null;
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
  alamatKantor: string | null;
  telepon: string | null;
  emailDesa: string | null;
  namaKepalaDesa: string | null;
  nipKepalaDesa: string | null;
  /** Jalur media gambar logo desa (opsional; dipakai di kop). */
  logo?: string | null;
  /** Jalur media gambar tanda tangan Kepala Desa (opsional). */
  tandaTangan?: string | null;
  /** Jalur media gambar stempel desa (opsional; menimpa area ttd). */
  stempel?: string | null;
}

export interface SuratPdfInput {
  desa: SuratPdfIdentity;
  jenisNama: string;
  nomor: string | null;
  tanggal: string;
  content: string;
  /** Tautan verifikasi publik; dicetak di footer bila tersedia. */
  verificationUrl?: string | null;
  /** JSON konfigurasi layout (opsional). */
  layoutConfig?: string | null;
  /** Varian template aktif (mis. default, landscape, compact). */
  templateVariant?: string | null;
  /** Badan surat alternatif untuk varian template (opsional). */
  templateBodyAlt?: string | null;
}

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Baca bytes gambar dari jalur berbentuk:
 * - `<villageId>/<kategori>/<berkas>` → langsung dari penyimpanan media;
 * - URL http(s) → diambil lewat fetch (fallback jalur media lama yang
 *   berupa tautan lengkap).
 *
 * Mengembalikan null bila gagal/kosong — gambar tidak wajib dan PDF tetap
 * dibuat tanpa itu.
 */
async function muatBytesGambar(jalur: string | null | undefined): Promise<Buffer | null> {
  if (!jalur || jalur.trim() === "") return null;

  try {
    if (/^https?:\/\//i.test(jalur)) {
      const respons = await fetch(jalur);
      if (!respons.ok) return null;
      return Buffer.from(await respons.arrayBuffer());
    }

    const bersih = jalur.replace(/^\/+/, "");
    return await bacaMedia(bersih);
  } catch {
    return null;
  }
}

/** Tanam gambar PNG/JPG (?webp/gif tidak didukung pdf-lib → dilewat). */
async function tanamGambar(pdf: PDFDocument, bytes: Buffer | null): Promise<PDFImage | null> {
  if (!bytes || bytes.length === 0) return null;

  const GUN = 0x89; // PNG signature: 89 50 4E 47
  const adalahPng =
    bytes.length > 4 &&
    bytes[0] === GUN &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const adalahJpg = bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;

  try {
    if (adalahPng) return await pdf.embedPng(bytes);
    if (adalahJpg) return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }

  return null;
}

// ── buildSuratPdf ─────────────────────────────────────────────────────────────

export async function buildSuratPdf(input: SuratPdfInput): Promise<Uint8Array> {
  // Parse layout config (JSON)
  let layout: Record<string, unknown> = {};
  if (input.layoutConfig) {
    try {
      layout = JSON.parse(input.layoutConfig);
    } catch {
      layout = {};
    }
  }

  // Determin posisi elemen berdasarkan varian template
  const variant = input.templateVariant ?? "default";

  // Default page settings; varian landscape ikut menentukan orientasi kertas
  // bila konfigurasi layout tidak menyebutkannya secara eksplisit.
  const orientasi =
    (layout.orientasi as string) ?? (variant === "landscape" ? "landscape" : "potrait");
  const isLandscape = orientasi === "landscape";
  const PAGE_WIDTH = isLandscape ? 841.89 : 595.28;
  const PAGE_HEIGHT = isLandscape ? 595.28 : 841.89;
  const MARGIN = typeof layout.margin === "number" ? layout.margin : 56;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const LINE_HEIGHT = 15;
  const variantPos =
    variant === "landscape"
      ? { ttdXOffset: 20, stampXOffset: 10, qrPosition: "header", qrMargin: 5 }
      : variant === "compact"
        ? { ttdXOffset: 50, stampXOffset: 5, qrPosition: "footer", qrMargin: 15 }
        : { ttdXOffset: 40, stampXOffset: 30, qrPosition: "footer", qrMargin: 10 };

  // Pilih template body berdasarkan varian
  const templateBody =
    input.templateVariant && input.templateVariant !== "default" && input.templateBodyAlt
      ? input.templateBodyAlt
      : (input.content ?? "");

  /** pdf-lib dengan font standar hanya mendukung WinAnsi; normalkan karakter. */
  function clean(value: string): string {
    return value
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u00a0/g, " ")
      .replace(/[^\x20-\x7E\n]/g, "?");
  }

  function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];

    for (const rawLine of text.split("\n")) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push("");
        continue;
      }

      let current = "";
      for (const word of words) {
        const candidate = current === "" ? word : `${current} ${word}`;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate;
          continue;
        }
        if (current !== "") lines.push(current);
        current = word;
      }
      if (current !== "") lines.push(current);
    }

    return lines;
  }

  function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number): void {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y, size, font, color: rgb(0, 0, 0) });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  // Muat gambar desa (dapat null → dicetak tanpa gambar terkait) + QR
  // verifikasi (PNG dibuat lokal dari ketergantungan `qrcode`).
  const qrBytes = input.verificationUrl
    ? await qrToBuffer(input.verificationUrl, {
        type: "png",
        margin: 1,
        width: 240,
        errorCorrectionLevel: "M",
      })
    : null;

  const [logo, ttd, stamp, qr] = await Promise.all([
    tanamGambar(pdf, await muatBytesGambar(input.desa.logo)),
    tanamGambar(pdf, await muatBytesGambar(input.desa.tandaTangan)),
    tanamGambar(pdf, await muatBytesGambar(input.desa.stempel)),
    tanamGambar(pdf, qrBytes),
  ]);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const desa = input.desa;
  const headerLines = [
    desa.namaPropinsi ? `PEMERINTAH ${desa.namaPropinsi.toUpperCase()}` : null,
    desa.namaKabupaten ? `KABUPATEN ${desa.namaKabupaten.toUpperCase()}` : null,
    desa.namaKecamatan ? `KECAMATAN ${desa.namaKecamatan.toUpperCase()}` : null,
    desa.namaDesa ? `DESA ${desa.namaDesa.toUpperCase()}` : "PEMERINTAH DESA",
  ].filter((line): line is string => line !== null);

  for (const [index, line] of headerLines.entries()) {
    centered(
      page,
      clean(line),
      y,
      index === headerLines.length - 1 ? bold : font,
      index === headerLines.length - 1 ? 14 : 12,
    );
    y -= index === headerLines.length - 1 ? 18 : 15;
  }

  const contact = [desa.alamatKantor, desa.telepon ? `Telp. ${desa.telepon}` : null, desa.emailDesa]
    .filter(Boolean)
    .join(" | ");
  if (contact) {
    centered(page, clean(contact), y, font, 9);
    y -= 12;
  }

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Logo desa di kiri kop (jika tersedia).
  if (logo) {
    const tinggi = 48;
    const lebar = Math.min((logo.width / logo.height) * tinggi, 60);
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 58,
      width: lebar,
      height: tinggi,
    });
  }

  centered(page, clean(input.jenisNama.toUpperCase()), y, bold, 12);
  y -= 16;
  if (input.nomor) {
    centered(page, clean(`Nomor: ${input.nomor}`), y, font, 10);
    y -= 24;
  } else {
    y -= 8;
  }

  const bodyLines = wrap(clean(templateBody), font, 11, CONTENT_WIDTH);
  const ensurePage = () => {
    if (y < MARGIN + 90) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  for (const line of bodyLines) {
    ensurePage();
    if (line !== "") {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
        maxWidth: CONTENT_WIDTH,
      });
    }
    y -= LINE_HEIGHT;
  }

  y -= 24;
  ensurePage();

  const signatureDate = formatTanggalIndonesia(input.tanggal);
  page.drawText(clean(`Desa ${desa.namaDesa ?? "..."}, ${signatureDate}`), {
    x: PAGE_WIDTH - MARGIN - 180,
    y,
    size: 11,
    font,
  });
  y -= 16;
  page.drawText("Kepala Desa", { x: PAGE_WIDTH - MARGIN - 180, y, size: 11, font });
  y -= 60;

  const headName = clean(desa.namaKepalaDesa ?? "..............................");
  const headWidth = bold.widthOfTextAtSize(headName, 11);

  // Gambar tanda tangan (di atas baris nama) & stempel (menimpa area ttd).
  const kolomTtdAwal = PAGE_WIDTH - MARGIN - Math.max(headWidth, 120) - variantPos.ttdXOffset;
  const gambarTtdX = kolomTtdAwal + 40;
  const gambarTtdTinggi = 40;

  if (ttd) {
    const lebar = Math.min((ttd.width / ttd.height) * gambarTtdTinggi, 140);
    page.drawImage(ttd, {
      x: gambarTtdX - lebar / 2,
      y: y - 46,
      width: lebar,
      height: gambarTtdTinggi,
    });
  }

  if (stamp) {
    const tinggiStamp = 70;
    const lebar = Math.min((stamp.width / stamp.height) * tinggiStamp, 90);
    page.drawImage(stamp, {
      x: kolomTtdAwal + variantPos.stampXOffset - lebar - 10,
      y: y - 68,
      width: lebar,
      height: tinggiStamp,
      opacity: 0.9,
    });
  }

  page.drawText(headName, { x: PAGE_WIDTH - MARGIN - headWidth, y, size: 11, font: bold });
  page.drawLine({
    start: { x: PAGE_WIDTH - MARGIN - Math.max(headWidth, 120), y: y - 3 },
    end: { x: PAGE_WIDTH - MARGIN, y: y - 3 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  if (desa.nipKepalaDesa) {
    const nip = clean(`NIP. ${desa.nipKepalaDesa}`);
    const nipWidth = font.widthOfTextAtSize(nip, 9);
    page.drawText(nip, { x: PAGE_WIDTH - MARGIN - nipWidth, y, size: 9, font });
  }

  if (input.verificationUrl) {
    const ukuranQr = qr ? 66 : 0;
    const qrPosition = variantPos.qrPosition;
    const footer = wrap(
      clean(`Verifikasi: ${input.verificationUrl}`),
      font,
      8,
      CONTENT_WIDTH - (qr ? ukuranQr + 10 : 0),
    );
    const tinggiFooter = Math.max(ukuranQr, footer.length * 10);
    const headerHeight = 60; // estimasi tinggi header

    let pageToUse = page;
    let footerY: number;
    let qrX: number;

    // Pindah halaman bila tanda tangan terlalu dekat dengan batas bawah agar tidak bertumpuk dengan QR/teks.
    if (qrPosition === "header") {
      // QR di header: letakkan di bagian atas halaman, di bawah header lines
      if (y < MARGIN + headerHeight + tinggiFooter + 8) {
        pageToUse = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      footerY = MARGIN + headerHeight + tinggiFooter - 8;
      qrX = MARGIN;
    } else {
      // QR di footer (default & compact)
      if (y < MARGIN + tinggiFooter + 8) {
        pageToUse = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      footerY = MARGIN + tinggiFooter - 8;
      qrX = MARGIN + variantPos.qrMargin;
    }

    if (qr) {
      pageToUse.drawImage(qr, { x: qrX, y: footerY, width: ukuranQr, height: ukuranQr });
    }

    let footerYActual = qrPosition === "header" ? footerY + headerHeight - 8 : footerY;
    for (const line of footer) {
      const width = font.widthOfTextAtSize(line, 8);
      pageToUse.drawText(line, {
        // QR di kiri, teks di kanannya; tanpa QR teks tetap di tengah.
        x: qr ? qrX + ukuranQr + 10 : (PAGE_WIDTH - width) / 2,
        y: footerYActual,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      });
      footerYActual -= 10;
    }
  }

  return pdf.save();
}
