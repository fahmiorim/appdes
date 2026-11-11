import { getIdentitas } from "@/features/desa/application/get-identitas";
import { getLaporanKeuangan } from "@/features/keuangan/application/keuangan-use-cases";
import { LAPORAN_KEUANGAN_RESOURCE } from "@/features/keuangan/domain/keuangan";
import {
  buildLaporanExcel,
  laporanExcelFilename,
} from "@/features/keuangan/domain/laporan-dokumen";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";

/**
 * Ekspor laporan APBDes sebagai berkas Excel 2003 XML (`.xls`).
 *
 * SpreadsheetML dipilih agar kolom angka tetap bertipe numerik sehingga dapat
 * dijumlahkan di Excel tanpa menambah dependensi pustaka.
 */
export async function GET(
  request: Request,
  _context: RouteContext<"/keuangan/laporan/ekspor-excel">,
) {
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

    const xml = buildLaporanExcel({
      namaDesa: desa?.namaDesa ?? null,
      kecamatan: desa?.namaKecamatan ?? null,
      tahun: laporan.tahun,
      baris: laporan.baris,
      total: laporan.total,
      bidang: laporan.bidang,
      totalBidang: laporan.totalBidang,
    });

    const filename = laporanExcelFilename(desa?.namaDesa ?? null, laporan.tahun);

    return new Response(`\uFEFF${xml}`, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat ekspor Excel laporan keuangan:", error);
    return new Response("Gagal membuat ekspor Excel.", { status: 500 });
  }
}
