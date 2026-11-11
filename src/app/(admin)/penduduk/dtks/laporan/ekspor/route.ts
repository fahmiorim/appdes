import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { exportRekapDtksUseCase } from "@/features/penduduk/application/dtks-use-cases";
import { DTKS_RESOURCE } from "@/features/penduduk/domain/dtks";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";

export async function GET(
  _request: Request,
  _context: RouteContext<"/penduduk/dtks/laporan/ekspor">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, DTKS_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  try {
    const villageId = await resolveVillageId(user);
    const { csv, filename } = await exportRekapDtksUseCase(villageId, {
      page: 1,
      perPage: 100000,
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat rekap DTKS:", error);
    return new Response("Gagal membuat rekap DTKS.", { status: 500 });
  }
}
