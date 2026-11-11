import { hasPermission } from "@/features/rbac/application/authorization";
import { exportLaporanRumahTangga } from "@/features/rumah-tangga/application/use-cases";
import { parseFilterRtm, RUMAH_TANGGA_RESOURCE } from "@/features/rumah-tangga/domain/rumah-tangga";
import { getCurrentUser } from "@/lib/dal";

export async function GET(
  request: Request,
  _context: RouteContext<"/rumah-tangga/laporan/ekspor">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, RUMAH_TANGGA_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const filter = parseFilterRtm({
    q: url.searchParams.get("q") ?? undefined,
    kelasSosial: url.searchParams.get("kelasSosial") ?? undefined,
    dusun: url.searchParams.get("dusun") ?? undefined,
    rw: url.searchParams.get("rw") ?? undefined,
    rt: url.searchParams.get("rt") ?? undefined,
    bdt: url.searchParams.get("bdt") ?? undefined,
  });

  try {
    const { csv, filename } = await exportLaporanRumahTangga(filter);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat laporan rumah tangga:", error);
    return new Response("Gagal membuat laporan rumah tangga.", { status: 500 });
  }
}
