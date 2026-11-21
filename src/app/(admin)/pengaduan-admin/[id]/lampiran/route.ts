import { NextResponse } from "next/server";

import { getPengaduanDetailData, bacaLampiranPengaduan } from "@/features/pengaduan/application/use-cases";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  }

  const row = await getPengaduanDetailData(id);
  if (!row?.lampiran) {
    return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  }

  const isi = await bacaLampiranPengaduan(row.lampiran);
  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="lampiran-${row.nomorTiket}.bin"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
