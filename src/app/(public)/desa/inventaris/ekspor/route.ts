import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getInventarisPublik } from "@/features/inventaris/application/inventaris-publik-use-cases";
import {
  buildInventarisCsv,
  inventarisCsvFilename,
  parseFilterInventaris,
} from "@/features/publik/domain/inventaris-publik";

export const dynamic = "force-dynamic";

/**
 * Ekspor CSV inventaris publik.
 *
 * Tenant diambil dari host permintaan, bukan dari query string. Filter yang
 * sama dengan halaman `/desa/inventaris` diteruskan agar unduhan sesuai dengan
 * daftar yang sedang dilihat warga.
 */
export async function GET(request: Request) {
  const desa = await getIdentitasFromRequest();
  const params = new URL(request.url).searchParams;
  const filter = parseFilterInventaris({
    q: params.get("q") ?? undefined,
    kategori: params.get("kategori") ?? undefined,
    kondisi: params.get("kondisi") ?? undefined,
    lokasi: params.get("lokasi") ?? undefined,
    tahun: params.get("tahun") ?? undefined,
  });

  const { rows } = await getInventarisPublik(desa.id, filter);
  const csv = buildInventarisCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${inventarisCsvFilename(desa.namaDesa)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
