import { exportDpt } from "@/features/penduduk/application/dpt-use-cases";
import { listDptParamsSchema } from "@/features/penduduk/domain/dpt";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

export async function GET(request: Request, _context: RouteContext<"/penduduk/dpt/ekspor">) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, PENDUDUK_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  // Parameter kosong dibuang agar skema memakai nilai bawaan, bukan "" yang
  // dipaksa menjadi 0 oleh `z.coerce.number()`.
  const url = new URL(request.url);
  const rawParams = Object.fromEntries(
    [...url.searchParams.entries()].filter(([, nilai]) => nilai.trim() !== ""),
  );

  const parsed = listDptParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return new Response("Parameter filter DPT tidak valid.", { status: 400 });
  }

  try {
    const { csv, filename } = await exportDpt(parsed.data);

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

    console.error("Gagal membuat ekspor DPT:", error);
    return new Response("Gagal membuat ekspor DPT.", { status: 500 });
  }
}
