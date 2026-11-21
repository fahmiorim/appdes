import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { laporanDesaTersimpan } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";

const csvCell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("laporan-statistik", "read");
    const villageId = await resolveVillageId(user), { id: raw } = await params, id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "ID laporan tidak valid." }, { status: 400 });
    const [report] = await db.select().from(laporanDesaTersimpan)
      .where(and(eq(laporanDesaTersimpan.id, id), eq(laporanDesaTersimpan.villageId, villageId))).limit(1);
    if (!report) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    const csv = "\uFEFF" + [report.kolom, ...report.baris].map(row => row.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${report.jenis}-${report.tahun}-${report.id}.csv"`,
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return NextResponse.json({ error: "Tidak dapat mengunduh laporan." }, { status: 403 });
  }
}
