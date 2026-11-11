import { getIdentitas } from "@/features/desa/application/get-identitas";
import { listRiwayatExport } from "@/features/penduduk/application/riwayat-penduduk-use-cases";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import {
  buildRiwayatPendudukCsv,
  normalisasiMutationType,
  normalisasiTanggal,
  riwayatPendudukFilename,
} from "@/features/penduduk/domain/riwayat-penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";

export async function GET(request: Request, _context: RouteContext<"/penduduk/riwayat/ekspor">) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, PENDUDUK_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const params = {
    type: normalisasiMutationType(url.searchParams.get("type")),
    q: url.searchParams.get("q")?.trim() ?? "",
    from: normalisasiTanggal(url.searchParams.get("from")),
    to: normalisasiTanggal(url.searchParams.get("to")),
  };

  try {
    const [rows, desa] = await Promise.all([listRiwayatExport(params), getIdentitas()]);
    const csv = buildRiwayatPendudukCsv({ namaDesa: desa?.namaDesa ?? null, rows });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${riwayatPendudukFilename(
          desa?.namaDesa ?? null,
        )}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat ekspor riwayat penduduk:", error);
    return new Response("Gagal membuat ekspor riwayat.", { status: 500 });
  }
}
