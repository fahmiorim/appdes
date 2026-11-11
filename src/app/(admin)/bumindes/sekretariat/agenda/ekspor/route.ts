import { exportBukuAgendaCsvData } from "@/features/bumindes/application/use-cases";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { isAppError } from "@/lib/errors";
import { penggunaRoute } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await penggunaRoute();
  if (!auth.ok) return auth.respons;
  const user = auth.user;
  if (!hasPermission(user.permissions, RESOURCES.bumindes, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const jenis = searchParams.get("jenis") ?? undefined;
    const hasil = await exportBukuAgendaCsvData(jenis);
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
    console.error("Gagal membuat ekspor buku agenda:", error);
    return new Response("Gagal membuat ekspor buku.", { status: 500 });
  }
}
