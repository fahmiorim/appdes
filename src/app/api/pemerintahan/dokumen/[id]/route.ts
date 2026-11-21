import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pemerintahanDokumen } from "@/db/schema";
import { getIdentitasFromRequest, resolveVillageId } from "@/features/desa/application/resolve-village";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { requirePermission } from "@/lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isSafeInteger(documentId) || documentId < 1) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  const desa = await getIdentitasFromRequest();
  const [document] = await db.select().from(pemerintahanDokumen)
    .where(and(eq(pemerintahanDokumen.villageId, desa.id), eq(pemerintahanDokumen.id, documentId)))
    .limit(1);
  if (!document) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

  if (!document.tampilPublik) {
    const resource = document.perangkatId ? "perangkat-desa" : "lembaga-desa";
    const user = await requirePermission(resource, "read");
    const villageId = await resolveVillageId(user);
    if (villageId !== desa.id) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  try {
    const bytes = await bacaMedia(document.berkas);
    const ext = document.berkas.split(".").pop()?.toLowerCase();
    const mime = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="dokumen-pemerintahan-${document.id}.${ext ?? "bin"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Berkas dokumen tidak tersedia." }, { status: 404 });
  }
}
