import { eksporArsipNomorSuratData } from "@/features/surat/application/surat-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

function angka(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** `GET /persuratan/surat/arsip/ekspor?q=&year=&jenis=&klasifikasi=` */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const year = angka(url.searchParams.get("year"));
  const typeId = angka(url.searchParams.get("jenis"));
  const classificationId = angka(url.searchParams.get("klasifikasi"));

  try {
    const { csv, filename } = await eksporArsipNomorSuratData({
      search,
      year,
      typeId,
      classificationId,
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return new Response(error.message, { status: appErrorStatus(error.code) });
    }
    console.error("Gagal mengekspor arsip nomor surat:", error);
    return new Response("Gagal mengekspor arsip nomor surat.", { status: 500 });
  }
}
