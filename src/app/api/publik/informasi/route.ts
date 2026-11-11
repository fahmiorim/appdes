import { jalankanApiPublik } from "@/features/api-publik/application/public-api";
import { cariHalamanDokumenPublik } from "@/features/publik/application/dokumen-publik";
import { daftarBerita, profilDesaPublik } from "@/features/publik/application/konten-publik";
import { parsePaginasiDokumen } from "@/features/publik/domain/dokumen";

/**
 * GET /api/publik/informasi
 *
 * Profil desa, berita terbaru, dan satu halaman dokumen aktif.
 * Query `page`/`pageSize` mengatur paginasi dokumen.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paginasi = parsePaginasiDokumen(searchParams.get("page"), searchParams.get("pageSize"));
  if (!paginasi) {
    return Response.json(
      { success: false, error: "Parameter page atau pageSize tidak valid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return jalankanApiPublik(request, "informasi", async (desa) => {
    const [profil, berita, dokumen] = await Promise.all([
      profilDesaPublik(desa.id),
      daftarBerita(desa.id),
      cariHalamanDokumenPublik(desa.id, {
        search: "",
        category: "semua",
        page: paginasi.page,
        pageSize: paginasi.pageSize,
      }),
    ]);

    return {
      profilDesa: profil,
      berita,
      dokumen: dokumen.rows,
      dokumenPagination: {
        page: dokumen.page,
        pageSize: dokumen.pageSize,
        totalItems: dokumen.total,
        totalPages: Math.ceil(dokumen.total / dokumen.pageSize),
      },
    };
  });
}
