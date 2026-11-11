import { exportBukuCsvData } from "@/features/bumindes/application/use-cases";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { isAppError } from "@/lib/errors";
import { penggunaRoute } from "@/lib/route-auth";

export async function GET(
  _request: Request,
  context: RouteContext<"/bumindes/buku-administrasi/[id]/ekspor">,
) {
  const auth = await penggunaRoute();
  if (!auth.ok) return auth.respons;
  const user = auth.user;
  if (!hasPermission(user.permissions, RESOURCES.bumindes, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const { id } = await context.params;
  const bukuId = Number(id);
  if (!Number.isInteger(bukuId) || bukuId < 1) {
    return new Response("Buku tidak valid.", { status: 400 });
  }

  try {
    const hasil = await exportBukuCsvData(bukuId);
    if (!hasil) return new Response("Buku tidak ditemukan.", { status: 404 });

    return new Response(hasil.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${hasil.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "FORBIDDEN") {
      return new Response("Anda tidak memiliki hak akses.", { status: 403 });
    }
    console.error("Gagal membuat ekspor buku administrasi:", error);
    return new Response("Gagal membuat ekspor buku.", { status: 500 });
  }
}
