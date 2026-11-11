import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getNamaDesaUseCase } from "@/features/desa/application/use-cases";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getStatistikBantuanUseCase } from "@/features/statistik/application/statistik-use-cases";
import {
  STATISTIK_BANTUAN_KINDS,
  STATISTIK_BANTUAN_LABELS,
  type StatistikBantuanKind,
} from "@/features/statistik/domain/statistik";
import { getCurrentUser } from "@/lib/dal";

interface StatistikBantuanResult {
  rows: Array<{
    label: string;
    total: number;
    male: number;
    female: number;
    percentage: number;
  }>;
  summary: { total: number; male: number; female: number };
}

async function createStatistikBantuanPdf(
  kind: StatistikBantuanKind,
  result: StatistikBantuanResult,
  villageName: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdfDoc.addPage(pageSize);
  const pageSizeObj = page.getSize();
  const height = pageSizeObj.height ?? pageSize[1];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const lineHeight = 14;
  let y = height - margin;

  function ensurePage(): void {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage(pageSize);
      y = height - margin;
    }
  }

  // Header
  page.drawText("Statistik Bantuan", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight * 1.5;

  page.drawText(`${villageName} — ${STATISTIK_BANTUAN_LABELS[kind]}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= lineHeight * 2;

  // Tanggal cetak
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  page.drawText(`Dicetak: ${today}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= lineHeight * 2;

  // Table header
  const colWidths = [220, 70, 70, 70, 70];
  const headers = ["Kategori", "Total", "Laki-laki", "Perempuan", "%"];

  // Header background
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  page.drawRectangle({
    x: margin,
    y: y - 2,
    width: tableWidth,
    height: lineHeight + 4,
    color: rgb(0.2, 0.4, 0.7),
  });

  let x = margin;
  headers.forEach((h, i) => {
    const width = colWidths[i];
    if (width !== undefined) {
      page.drawText(h, {
        x: x + 4,
        y: y + 2,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      x += width;
    }
  });
  y -= lineHeight + 4;

  // Table rows
  for (const row of result.rows) {
    if (!row) continue;
    ensurePage();

    const values = [
      row.label,
      row.total.toLocaleString("id-ID"),
      row.male.toLocaleString("id-ID"),
      row.female.toLocaleString("id-ID"),
      `${row.percentage}%`,
    ];

    // Row background
    page.drawRectangle({
      x: margin,
      y: y - 2,
      width: tableWidth,
      height: lineHeight + 4,
      color: rgb(0.95, 0.95, 0.98),
    });

    x = margin;
    values.forEach((v, i) => {
      const width = colWidths[i];
      if (width !== undefined) {
        page.drawText(v, {
          x: x + 4,
          y: y + 2,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
        x += width;
      }
    });

    y -= lineHeight + 4;
  }

  // Total row
  ensurePage();

  const totalValues = [
    "Total",
    result.summary.total.toLocaleString("id-ID"),
    result.summary.male.toLocaleString("id-ID"),
    result.summary.female.toLocaleString("id-ID"),
    "100%",
  ];

  page.drawRectangle({
    x: margin,
    y: y - 2,
    width: tableWidth,
    height: lineHeight + 4,
    color: rgb(0.2, 0.4, 0.7),
  });

  x = margin;
  totalValues.forEach((v, i) => {
    const width = colWidths[i];
    if (width !== undefined) {
      page.drawText(v, {
        x: x + 4,
        y: y + 2,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      x += width;
    }
  });

  // Footer
  y -= lineHeight * 3;
  page.drawText("Sistem Informasi Desa — Laporan Statistik Bantuan", {
    x: margin,
    y,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}

export async function GET(request: Request, _context: { params: Promise<Record<string, string>> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sesi Anda telah berakhir.", { status: 401 });
  if (!hasPermission(user.permissions, RESOURCES.bantuan, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("kind") ?? "program";
  const kind = (STATISTIK_BANTUAN_KINDS as readonly string[]).includes(requested)
    ? (requested as StatistikBantuanKind)
    : "program";

  const programSlug = url.searchParams.get("programSlug") || undefined;
  const dusun = url.searchParams.get("dusun") || undefined;
  const rw = url.searchParams.get("rw") || undefined;
  const rt = url.searchParams.get("rt") || undefined;
  const periodeMulai = url.searchParams.get("periodeMulai") || undefined;
  const periodeAkhir = url.searchParams.get("periodeAkhir") || undefined;
  const sasaranAngka = Number(url.searchParams.get("sasaran"));
  const sasaran =
    Number.isInteger(sasaranAngka) && sasaranAngka >= 1 && sasaranAngka <= 4
      ? sasaranAngka
      : undefined;

  const villageId = await resolveVillageId(user);
  const result = await getStatistikBantuanUseCase(villageId, {
    kind,
    programSlug,
    sasaran,
    dusun,
    rw,
    rt,
    periodeMulai,
    periodeAkhir,
    perPage: 100,
  });

  // Get village name for header
  const villageName = (await getNamaDesaUseCase(villageId)) ?? "Desa";

  try {
    const pdfBytes = await createStatistikBantuanPdf(kind, result, villageName);
    const arrayBuffer = pdfBytes.buffer as ArrayBuffer;
    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="statistik-bantuan-${kind}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response("Gagal membuat PDF.", { status: 500 });
  }
}
