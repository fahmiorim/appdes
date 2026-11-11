import { getIdentitas } from "@/features/desa/application/get-identitas";
import { getLaporanKeuangan } from "@/features/keuangan/application/keuangan-use-cases";
import { LAPORAN_KEUANGAN_RESOURCE } from "@/features/keuangan/domain/keuangan";
import { buildLaporanCsv, laporanCsvFilename } from "@/features/keuangan/domain/laporan-csv";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";

export async function GET(request: Request, _context: RouteContext<"/keuangan/laporan/ekspor">) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, LAPORAN_KEUANGAN_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const tahunRaw = url.searchParams.get("tahun");
  const tahunParam = tahunRaw ? Number(tahunRaw) : undefined;
  const bidangParam = url.searchParams.get("bidang") ?? undefined;
  try {
    const [laporan, desa] = await Promise.all([
      getLaporanKeuangan(tahunParam, bidangParam),
      getIdentitas(),
    ]);

    const csv = buildLaporanCsv({
      namaDesa: desa?.namaDesa ?? null,
      kecamatan: desa?.namaKecamatan ?? null,
      tahun: laporan.tahun,
      baris: laporan.baris,
      total: laporan.total,
      bidang: laporan.bidang,
      totalBidang: laporan.totalBidang,
    });

    const filename = laporanCsvFilename(desa?.namaDesa ?? null, laporan.tahun);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat ekspor laporan keuangan:", error);
    return new Response("Gagal membuat ekspor laporan.", { status: 500 });
  }
}
