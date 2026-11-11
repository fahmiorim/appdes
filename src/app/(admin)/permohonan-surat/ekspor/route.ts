import { eksporPermohonanData } from "@/features/layanan-mandiri/application/admin-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

function tanggalValid(value: string | null): string | undefined {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function angka(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

/** `GET /permohonan-surat/ekspor?dari=&sampai=&jenis=&status=` */
export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const { csv, filename } = await eksporPermohonanData({
      dari: tanggalValid(url.searchParams.get("dari")),
      sampai: tanggalValid(url.searchParams.get("sampai")),
      typeId: angka(url.searchParams.get("jenis")),
      status: angka(url.searchParams.get("status")),
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
    console.error("Gagal mengekspor permohonan surat:", error);
    return new Response("Gagal mengekspor permohonan surat.", { status: 500 });
  }
}
