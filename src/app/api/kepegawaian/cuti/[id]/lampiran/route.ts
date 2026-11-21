import { NextResponse } from "next/server";

import { bacaLampiranCutiData } from "@/features/kepegawaian/application/use-cases";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id < 1)
      return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
    const lampiran = await bacaLampiranCutiData(id);
    if (!lampiran)
      return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
    return new Response(new Uint8Array(lampiran.isi), {
      headers: {
        "Content-Type": MIME[lampiran.ekstensi] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="lampiran-cuti-${lampiran.id}.${lampiran.ekstensi}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tidak dapat mengakses lampiran." }, { status: 403 });
  }
}
