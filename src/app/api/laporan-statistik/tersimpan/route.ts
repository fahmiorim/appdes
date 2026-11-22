import { NextResponse } from "next/server";

import {
  loadSavedReports,
  removeSavedReport,
  renameSavedReport,
  saveReport,
  type JenisLaporan,
} from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

const jenisValid: JenisLaporan[] = [
  "penduduk",
  "keuangan",
  "pembangunan",
  "bantuan",
  "aset",
  "layanan",
  "surat-masuk",
  "surat-keluar",
];
const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });
const handleError = (error: unknown, fallback: string) =>
  isAppError(error)
    ? jsonError(error.message, appErrorStatus(error.code))
    : jsonError(fallback, 500);

export async function GET() {
  try {
    const rows = await loadSavedReports();
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleError(error, "Tidak dapat memuat laporan tersimpan.");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      judul?: string;
      jenis?: string;
      tahun?: number;
      deskripsi?: string;
    };
    const judul = body.judul?.trim();
    const jenis = body.jenis as JenisLaporan;
    const tahun = Number(body.tahun);
    if (!judul || judul.length > 200)
      return jsonError("Judul wajib diisi (maksimal 200 karakter).", 400);
    if (!jenisValid.includes(jenis) || !Number.isInteger(tahun) || tahun < 2000 || tahun > 2100)
      return jsonError("Jenis atau tahun laporan tidak valid.", 400);
    await saveReport({
      judul,
      jenis,
      tahun,
      deskripsi: body.deskripsi?.trim() || null,
    });
    return NextResponse.json({ message: "Laporan berhasil disimpan." }, { status: 201 });
  } catch (error) {
    return handleError(error, "Laporan gagal disimpan.");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: number; judul?: string; deskripsi?: string };
    const id = Number(body.id),
      judul = body.judul?.trim();
    if (!Number.isInteger(id) || id < 1 || !judul || judul.length > 200)
      return jsonError("Data perubahan tidak valid.", 400);
    const changes: { judul: string; deskripsi?: string | null } = { judul };
    if ("deskripsi" in body) changes.deskripsi = body.deskripsi?.trim() || null;
    if (!(await renameSavedReport(id, changes))) return jsonError("Laporan tidak ditemukan.", 404);
    return NextResponse.json({ message: "Laporan berhasil diperbarui." });
  } catch (error) {
    return handleError(error, "Laporan gagal diperbarui.");
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) return jsonError("ID laporan tidak valid.", 400);
    if (!(await removeSavedReport(id))) return jsonError("Laporan tidak ditemukan.", 404);
    return NextResponse.json({ message: "Laporan berhasil dihapus." });
  } catch (error) {
    return handleError(error, "Laporan gagal dihapus.");
  }
}
