import { jalankanApiPublik } from "@/features/api-publik/application/public-api";
import { cariInventarisPublik } from "@/features/inventaris/application/inventaris-publik-use-cases";

/**
 * GET /api/publik/inventaris
 *
 * Inventaris publik desa. Query: `search` (opsional) untuk nama/nomor/kode.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";

  return jalankanApiPublik(request, "inventaris", async (desa) => {
    const { rows, total } = await cariInventarisPublik(desa.id, search);
    return { items: rows, total };
  });
}
