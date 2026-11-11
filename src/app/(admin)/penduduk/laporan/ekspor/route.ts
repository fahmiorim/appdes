import { getIdentitas } from "@/features/desa/application/get-identitas";
import {
  getLaporanPenduduk,
  normalisasiJenis,
} from "@/features/penduduk/application/laporan-penduduk-use-cases";
import {
  buildLaporanPendudukCsv,
  laporanPendudukFilename,
} from "@/features/penduduk/domain/laporan-penduduk";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";

export async function GET(request: Request, _context: RouteContext<"/penduduk/laporan/ekspor">) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, PENDUDUK_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const jenis = normalisasiJenis(url.searchParams.get("jenis") ?? undefined);

  try {
    const [laporan, desa] = await Promise.all([getLaporanPenduduk(jenis), getIdentitas()]);

    const csv = buildLaporanPendudukCsv({
      namaDesa: desa?.namaDesa ?? null,
      kecamatan: desa?.namaKecamatan ?? null,
      jenis: laporan.jenis,
      statistik: laporan.statistik,
    });

    const filename = laporanPendudukFilename(desa?.namaDesa ?? null, laporan.jenis);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat ekspor laporan penduduk:", error);
    return new Response("Gagal membuat ekspor laporan.", { status: 500 });
  }
}
