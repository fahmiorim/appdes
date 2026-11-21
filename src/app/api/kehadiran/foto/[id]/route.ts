import { NextResponse } from "next/server";

import { bacaBuktiAbsensiData } from "@/features/kepegawaian/application/use-cases";

const MIME: Record<string, string> = {
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
      return NextResponse.json({ error: "Bukti absensi tidak ditemukan." }, { status: 404 });
    const bukti = await bacaBuktiAbsensiData(id);
    if (!bukti)
      return NextResponse.json({ error: "Bukti absensi tidak ditemukan." }, { status: 404 });
    return new Response(new Uint8Array(bukti.isi), {
      headers: {
        "Content-Type": MIME[bukti.ekstensi] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="bukti-absensi-${bukti.id}.${bukti.ekstensi}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tidak dapat mengakses bukti absensi." }, { status: 403 });
  }
}
