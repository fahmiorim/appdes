import { NextResponse } from "next/server";

import { getHasilSurveiData } from "@/features/pelayanan/application/survei-use-cases";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1)
    return new NextResponse("ID tidak valid", { status: 400 });
  const data = await getHasilSurveiData(id);
  const quote = (value: string | number) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
  const rows: Array<Array<string | number>> = [["Pertanyaan", "Jawaban", "Jumlah"]];
  for (const question of data.questionStats) {
    if (question.pilihan.length) {
      for (const item of question.pilihan)
        rows.push([question.pertanyaan, item.jawaban, item.total]);
    } else rows.push([question.pertanyaan, "", question.total]);
  }
  const csv = "\uFEFF" + rows.map((row) => row.map(quote).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hasil-survei-' + id + '.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
