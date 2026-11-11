import { exportRekapKia } from "@/features/kesehatan/application/kia-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

export async function GET(_request: Request) {
  try {
    const { csv, filename } = await exportRekapKia();

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

    console.error("Gagal membuat rekapitulasi KIA:", error);
    return new Response("Gagal membuat rekapitulasi KIA.", { status: 500 });
  }
}
