import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikPublik } from "@/features/desa/application/statistik-publik";
import {
  buildStatistikPublikCsv,
  statistikPublikCsvFilename,
} from "@/features/desa/domain/statistik-publik-csv";

export const dynamic = "force-dynamic";

/**
 * Ekspor CSV statistik publik.
 *
 * Tenant diambil dari host permintaan, bukan dari query string, sehingga satu
 * desa tidak dapat mengunduh angka desa lain. Isinya sama dengan ringkasan yang
 * tampil di `/desa/statistik` dan tidak memuat data pribadi penduduk.
 */
export async function GET() {
  const desa = await getIdentitasFromRequest();
  const statistik = await getStatistikPublik(desa.id);
  const csv = buildStatistikPublikCsv(statistik);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${statistikPublikCsvFilename(desa.namaDesa)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
