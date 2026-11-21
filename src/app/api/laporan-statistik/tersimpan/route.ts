import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { laporanDesaTersimpan } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getLaporanDesa, type JenisLaporan } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { requirePermission } from "@/lib/dal";

const jenisValid: JenisLaporan[] = ["penduduk", "keuangan", "pembangunan", "bantuan"];
const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    const user = await requirePermission("laporan-statistik", "read");
    const villageId = await resolveVillageId(user);
    const rows = await db.select({
      id: laporanDesaTersimpan.id, judul: laporanDesaTersimpan.judul,
      jenis: laporanDesaTersimpan.jenis, tahun: laporanDesaTersimpan.tahun,
      deskripsi: laporanDesaTersimpan.deskripsi, createdAt: laporanDesaTersimpan.createdAt,
    }).from(laporanDesaTersimpan)
      .where(eq(laporanDesaTersimpan.villageId, villageId))
      .orderBy(desc(laporanDesaTersimpan.createdAt));
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return jsonError("Tidak dapat memuat laporan tersimpan. Periksa sesi dan hak akses Anda.", 403);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("laporan-statistik", "manage");
    const villageId = await resolveVillageId(user);
    const body = await request.json() as { judul?: string; jenis?: string; tahun?: number; deskripsi?: string };
    const judul = body.judul?.trim();
    const jenis = body.jenis as JenisLaporan;
    const tahun = Number(body.tahun);
    if (!judul || judul.length > 200) return jsonError("Judul wajib diisi (maksimal 200 karakter).", 400);
    if (!jenisValid.includes(jenis) || !Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return jsonError("Jenis atau tahun laporan tidak valid.", 400);
    const report = await getLaporanDesa(jenis, tahun);
    await db.insert(laporanDesaTersimpan).values({
      villageId, judul, jenis, tahun, deskripsi: body.deskripsi?.trim() || null,
      kolom: report.columns, baris: report.rows, dibuatOleh: user.id,
    });
    return NextResponse.json({ message: "Laporan berhasil disimpan." }, { status: 201 });
  } catch {
    return jsonError("Laporan gagal disimpan. Periksa sesi, hak akses, dan koneksi data.", 403);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission("laporan-statistik", "manage");
    const villageId = await resolveVillageId(user);
    const body = await request.json() as { id?: number; judul?: string; deskripsi?: string };
    const id = Number(body.id), judul = body.judul?.trim();
    if (!Number.isInteger(id) || id < 1 || !judul || judul.length > 200) return jsonError("Data perubahan tidak valid.", 400);
    const result = await db.update(laporanDesaTersimpan)
      .set({ judul, deskripsi: body.deskripsi?.trim() || null })
      .where(and(eq(laporanDesaTersimpan.id, id), eq(laporanDesaTersimpan.villageId, villageId)));
    if (!result.affectedRows) return jsonError("Laporan tidak ditemukan.", 404);
    return NextResponse.json({ message: "Laporan berhasil diperbarui." });
  } catch {
    return jsonError("Laporan gagal diperbarui. Periksa sesi dan hak akses Anda.", 403);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("laporan-statistik", "manage");
    const villageId = await resolveVillageId(user);
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) return jsonError("ID laporan tidak valid.", 400);
    const result = await db.delete(laporanDesaTersimpan)
      .where(and(eq(laporanDesaTersimpan.id, id), eq(laporanDesaTersimpan.villageId, villageId)));
    if (!result[0].affectedRows) return jsonError("Laporan tidak ditemukan.", 404);
    return NextResponse.json({ message: "Laporan berhasil dihapus." });
  } catch {
    return jsonError("Laporan gagal dihapus. Periksa sesi dan hak akses Anda.", 403);
  }
}
