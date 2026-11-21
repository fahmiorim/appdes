import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { laporanDesaTersimpan } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { exportLaporan, type ExportFormat } from "@/features/laporan-statistik/application/export-laporan";
import { requirePermission } from "@/lib/dal";
export const runtime = "nodejs";
const formats: ExportFormat[] = ["csv","xlsx","pdf"];
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("laporan-statistik", "read");
    const villageId = await resolveVillageId(user), { id: raw } = await params, id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "ID laporan tidak valid." }, { status: 400 });
    const format=(new URL(request.url).searchParams.get("format")||"csv") as ExportFormat;
    if(!formats.includes(format)) return NextResponse.json({error:"Format ekspor tidak didukung."},{status:400});
    const [report] = await db.select().from(laporanDesaTersimpan)
      .where(and(eq(laporanDesaTersimpan.id, id), eq(laporanDesaTersimpan.villageId, villageId))).limit(1);
    if (!report) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    return await exportLaporan({title:report.judul,filename:"laporan-"+report.jenis+"-"+report.tahun+"-"+report.id,columns:report.kolom,rows:report.baris},format);
  } catch {
    return NextResponse.json({ error: "Tidak dapat mengunduh laporan." }, { status: 500 });
  }
}
