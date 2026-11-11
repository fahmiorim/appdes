import { exportRekapIbuHamil } from "@/features/kesehatan/application/export-use-cases";
import { KIA_RESOURCE } from "@/features/kesehatan/domain/kesehatan";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

/**
 * GET /admin/kesehatan/ibu-hamil/ekspor
 * Returns CSV file with all Ibu Hamil data.
 */
export async function GET(_request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, KIA_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  try {
    const { csv, filename } = await exportRekapIbuHamil();
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
    console.error("Gagal mengekspor Ibu Hamil:", error);
    return new Response("Gagal mengekspor Ibu Hamil.", { status: 500 });
  }
}
