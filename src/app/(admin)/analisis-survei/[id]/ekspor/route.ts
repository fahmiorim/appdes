import { exportSurveyCsvData } from "@/features/survey/application/use-cases";
import { isAppError } from "@/lib/errors";

/**
 * Ekspor respons survei ke CSV.
 *
 * Tenant & izin diperiksa di use case (`requirePermission` + `resolveVillageId`),
 * sehingga `villageId` tidak pernah berasal dari URL.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/analisis-survei/[id]/ekspor">,
) {
  const { id } = await params;
  const surveyId = Number(id);

  if (!Number.isInteger(surveyId) || surveyId <= 0) {
    return new Response("Survei tidak valid.", { status: 400 });
  }

  try {
    const { filename, csv } = await exportSurveyCsvData(surveyId);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      if (error.code === "NOT_FOUND") return new Response(error.message, { status: 404 });
      if (error.code === "FORBIDDEN" || error.code === "UNAUTHENTICATED") {
        return new Response("Anda tidak memiliki hak akses.", { status: 403 });
      }
    }

    console.error("Gagal membuat ekspor respons survei:", error);
    return new Response("Gagal membuat ekspor respons survei.", { status: 500 });
  }
}
