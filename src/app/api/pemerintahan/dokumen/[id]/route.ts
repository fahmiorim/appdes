import { NextResponse } from "next/server";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { unduhDokumenPemerintahanData } from "@/features/pemerintahan/application/use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isSafeInteger(documentId) || documentId < 1) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  const desa = await getIdentitasFromRequest();
  const dokumen = await unduhDokumenPemerintahanData(desa.id, documentId);
  if (!dokumen) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

  const mime = MIME_BY_EXT[dokumen.ekstensi] ?? "image/jpeg";
  return new NextResponse(new Uint8Array(dokumen.isi), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="dokumen-pemerintahan-${dokumen.id}.${dokumen.ekstensi}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
