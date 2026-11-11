import { bacaBerkasSyaratAdmin } from "@/features/layanan-mandiri/application/admin-use-cases";
import { CSP_MEDIA_SANDBOX } from "@/features/publik/domain/media";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

/** Berkas syarat untuk operator; memerlukan izin baca permohonan surat. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/permohonan-surat/[id]/syarat/[syaratId]">,
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sesi Anda telah berakhir.", { status: 401 });
  if (!hasPermission(user.permissions, RESOURCES.permohonanSurat, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const { id, syaratId } = await params;
  const permohonanId = Number(id);
  const syarat = Number(syaratId);

  if (!Number.isInteger(permohonanId) || permohonanId <= 0) {
    return new Response("Permohonan tidak valid.", { status: 400 });
  }
  if (!Number.isInteger(syarat) || syarat <= 0) {
    return new Response("Syarat tidak valid.", { status: 400 });
  }

  try {
    const berkas = await bacaBerkasSyaratAdmin(permohonanId, syarat);
    const nama = berkas.namaAsli.replace(/[^\w.\- ]+/g, "_") || "berkas";

    const mime = berkas.mime || "application/octet-stream";
    return new Response(new Uint8Array(berkas.isi), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${nama}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(mime === "image/svg+xml" ? { "Content-Security-Policy": CSP_MEDIA_SANDBOX } : {}),
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return new Response(error.message, { status: appErrorStatus(error.code) });
    }

    console.error("Gagal membaca berkas syarat permohonan:", error);
    return new Response("Gagal membaca berkas.", { status: 500 });
  }
}
