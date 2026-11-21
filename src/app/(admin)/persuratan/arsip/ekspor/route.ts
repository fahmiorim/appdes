import { NextResponse, type NextRequest } from "next/server";

import { eksporArsipNomorSuratData } from "@/features/surat/application/surat-use-cases";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const angka = (value: string | null) => {
    if (!value || !/^\d+$/.test(value)) return undefined;
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : undefined;
  };
  const result = await eksporArsipNomorSuratData({
    search: (params.get("q") ?? "").trim().slice(0, 100),
    year: angka(params.get("tahun")),
    typeId: angka(params.get("jenis")),
    classificationId: angka(params.get("klasifikasi")),
  });
  return new NextResponse(result.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
