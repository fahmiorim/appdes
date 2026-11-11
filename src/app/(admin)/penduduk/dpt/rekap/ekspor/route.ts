import { exportRekapDpt } from "@/features/penduduk/application/dpt-use-cases";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

export async function GET(_request: Request, _context: RouteContext<"/penduduk/dpt/rekap/ekspor">) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, PENDUDUK_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  try {
    const { csv, filename } = await exportRekapDpt();

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

    console.error("Gagal membuat rekapitulasi DPT:", error);
    return new Response("Gagal membuat rekapitulasi DPT.", { status: 500 });
  }
}
