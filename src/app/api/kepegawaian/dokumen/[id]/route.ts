import { NextResponse } from "next/server";

import { bacaDokumenPegawaiData } from "@/features/kepegawaian/application/use-cases";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isSafeInteger(id) || id < 1)
      return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    const dokumen = await bacaDokumenPegawaiData(id);
    if (!dokumen) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    return new Response(new Uint8Array(dokumen.isi), {
      headers: {
        "Content-Type": MIME[dokumen.ekstensi] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="dokumen-${dokumen.id}.${dokumen.ekstensi}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tidak dapat mengakses dokumen." }, { status: 403 });
  }
}
