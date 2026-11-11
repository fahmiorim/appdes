import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getDokumenKerjasama } from "@/features/pelanggan/application/pelanggan-use-cases";
import { PELANGGAN_RESOURCE } from "@/features/pelanggan/domain/pelanggan";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

/**
 * Unduh dokumen kerja sama pelanggan. Hanya operator dengan izin baca
 * `pelanggan` pada desa yang sama; berkas disajikan `inline` agar PDF/gambar
 * dapat dipratinjau tanpa meninggalkan origin aplikasi.
 */
export async function GET(_request: Request, { params }: RouteContext<"/pelanggan/[id]/dokumen">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sesi Anda telah berakhir.", { status: 401 });
  if (!hasPermission(user.permissions, PELANGGAN_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const { id } = await params;
  const pelangganId = Number(id);
  if (!Number.isInteger(pelangganId) || pelangganId <= 0) {
    return new Response("Pelanggan tidak valid.", { status: 400 });
  }

  try {
    const villageId = await resolveVillageId(user);
    const { row, isi } = await getDokumenKerjasama(villageId, pelangganId);
    const nama = (row.dokumenNama ?? "dokumen-kerja-sama").replace(/[^\w.\- ]+/g, "_");

    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": row.dokumenMime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${nama}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return new Response(error.message, { status: appErrorStatus(error.code) });
    }

    console.error("Gagal membaca dokumen kerja sama:", error);
    return new Response("Gagal membaca dokumen.", { status: 500 });
  }
}
