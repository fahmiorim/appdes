import { jalankanApiPublik } from "@/features/api-publik/application/public-api";
import { cariHalamanDokumenPublik } from "@/features/publik/application/dokumen-publik";
import { parseDokumenKategoriFilter, parsePaginasiDokumen } from "@/features/publik/domain/dokumen";

/**
 * GET /api/publik/dokumen
 *
 * Dokumen aktif dengan filter `kategori` dan paginasi `page`/`pageSize`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kategoriInput = searchParams.get("kategori")?.trim() ?? "";
  const kategori = parseDokumenKategoriFilter(kategoriInput || undefined);
  const paginasi = parsePaginasiDokumen(searchParams.get("page"), searchParams.get("pageSize"));

  if (kategoriInput && kategori === "semua") {
    return Response.json(
      { success: false, error: "Kategori dokumen tidak valid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!paginasi) {
    return Response.json(
      { success: false, error: "Parameter page atau pageSize tidak valid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return jalankanApiPublik(
    request,
    "dokumen",
    (desa) =>
      cariHalamanDokumenPublik(desa.id, {
        search: "",
        category: kategori,
        page: paginasi.page,
        pageSize: paginasi.pageSize,
      }),
    ({ rows, total, page, pageSize }) => ({
      data: rows,
      pagination: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    }),
  );
}
