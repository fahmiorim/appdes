import { NextResponse } from "next/server";

import {
  exportLaporan,
  type ExportFormat,
} from "@/features/laporan-statistik/application/export-laporan";
import { getSavedReport } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

export const runtime = "nodejs";
const formats: ExportFormat[] = ["csv", "xlsx", "pdf"];
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await params,
      id = Number(raw);
    if (!Number.isInteger(id) || id < 1)
      return NextResponse.json({ error: "ID laporan tidak valid." }, { status: 400 });
    const format = (new URL(request.url).searchParams.get("format") || "csv") as ExportFormat;
    if (!formats.includes(format))
      return NextResponse.json({ error: "Format ekspor tidak didukung." }, { status: 400 });
    const report = await getSavedReport(id);
    if (!report) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    return await exportLaporan(
      {
        title: report.judul,
        filename: "laporan-" + report.jenis + "-" + report.tahun + "-" + report.id,
        columns: report.kolom,
        rows: report.baris,
      },
      format,
    );
  } catch (error) {
    if (isAppError(error))
      return NextResponse.json({ error: error.message }, { status: appErrorStatus(error.code) });
    return NextResponse.json({ error: "Tidak dapat mengunduh laporan." }, { status: 500 });
  }
}
