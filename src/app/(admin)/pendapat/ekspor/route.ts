import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { exportPendapatUseCase } from "@/features/pendapat/application/use-cases";
import { PENDAPAT_RESOURCE } from "@/features/pendapat/domain/pendapat";
import { hasPermission } from "@/features/rbac/application/authorization";
import { penggunaRoute } from "@/lib/route-auth";

export async function GET(_request: Request, _context: RouteContext<"/pendapat/ekspor">) {
  const auth = await penggunaRoute();
  if (!auth.ok) return auth.respons;
  const user = auth.user;
  if (!hasPermission(user.permissions, PENDAPAT_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  try {
    const villageId = await resolveVillageId(user);
    const result = await exportPendapatUseCase(villageId);
    if (!result) {
      return new Response("Belum ada data pendapat untuk diexport.", { status: 404 });
    }

    return new Response(result.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat ekspor pendapat:", error);
    return new Response("Gagal membuat ekspor pendapat.", { status: 500 });
  }
}
