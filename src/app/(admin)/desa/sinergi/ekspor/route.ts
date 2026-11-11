import { daftarSinergi } from "@/features/sinergi/application/sinergi-use-cases";
import { buatCsvSinergi } from "@/features/sinergi/domain/sinergi";
import { appErrorStatus, isAppError } from "@/lib/errors";

export async function GET(_request: Request) {
  try {
    const rows = await daftarSinergi();
    const tanggal = new Date().toISOString().slice(0, 10);

    return new Response(buatCsvSinergi(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sinergi-program-${tanggal}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return new Response(error.message, { status: appErrorStatus(error.code) });
    }

    console.error("Gagal membuat ekspor sinergi:", error);
    return new Response("Gagal membuat ekspor sinergi.", { status: 500 });
  }
}
