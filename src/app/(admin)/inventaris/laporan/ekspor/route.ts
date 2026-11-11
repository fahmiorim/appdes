import { getIdentitas } from "@/features/desa/application/get-identitas";
import { getLaporanInventarisCsv } from "@/features/inventaris/application/inventaris-use-cases";
import { inventarisCsvFilename } from "@/features/inventaris/domain/laporan-inventaris";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getCurrentUser } from "@/lib/dal";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, RESOURCES.inventaris, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const kategoriRaw = url.searchParams.get("kategori");
  const kategoriId = kategoriRaw ? Number(kategoriRaw) : undefined;
  const kategoriParam = Number.isFinite(kategoriId) ? kategoriId : undefined;

  try {
    const [laporan, desa] = await Promise.all([
      getLaporanInventarisCsv(kategoriParam),
      getIdentitas(),
    ]);

    const filename = inventarisCsvFilename(desa?.namaDesa ?? null, laporan.kategoriNama);

    return new Response(laporan.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat ekspor laporan inventaris:", error);
    return new Response("Gagal membuat ekspor laporan.", { status: 500 });
  }
}
