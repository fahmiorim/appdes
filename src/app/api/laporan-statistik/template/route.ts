import { NextResponse } from "next/server";

import {
  loadReportTemplates,
  removeReportTemplate,
  renameReportTemplate,
  saveReportTemplate,
  type JenisLaporan,
} from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

const kinds: JenisLaporan[] = [
  "penduduk",
  "keuangan",
  "pembangunan",
  "bantuan",
  "aset",
  "layanan",
  "surat-masuk",
  "surat-keluar",
];
const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });
const handle = (e: unknown) =>
  isAppError(e)
    ? error(e.message, appErrorStatus(e.code))
    : error("Operasi template laporan gagal.", 500);
export async function GET() {
  try {
    const rows = await loadReportTemplates();
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return handle(e);
  }
}
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { judul?: string; jenis?: string; deskripsi?: string };
    const judul = body.judul?.trim(),
      jenis = body.jenis as JenisLaporan;
    if (!judul || judul.length > 150 || !kinds.includes(jenis))
      return error("Judul atau jenis template tidak valid.", 400);
    await saveReportTemplate({
      judul,
      jenis,
      deskripsi: body.deskripsi?.trim() || null,
    });
    return NextResponse.json({ message: "Template laporan berhasil dibuat." }, { status: 201 });
  } catch (e) {
    return handle(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: number; judul?: string; deskripsi?: string };
    const id = Number(body.id),
      judul = body.judul?.trim();
    if (!Number.isInteger(id) || id < 1 || !judul || judul.length > 150)
      return error("Data template tidak valid.", 400);
    const changes: { judul: string; deskripsi?: string | null } = { judul };
    if ("deskripsi" in body) changes.deskripsi = body.deskripsi?.trim() || null;
    if (!(await renameReportTemplate(id, changes))) return error("Template tidak ditemukan.", 404);
    return NextResponse.json({ message: "Template laporan diperbarui." });
  } catch (e) {
    return handle(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) return error("ID template tidak valid.", 400);
    if (!(await removeReportTemplate(id))) return error("Template tidak ditemukan.", 404);
    return NextResponse.json({ message: "Template laporan dihapus." });
  } catch (e) {
    return handle(e);
  }
}
