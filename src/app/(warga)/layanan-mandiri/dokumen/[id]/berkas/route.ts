import { bacaBerkasDokumenWarga } from "@/features/layanan-mandiri/application/warga-use-cases";
import { CSP_MEDIA_SANDBOX } from "@/features/publik/domain/media";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

/**
 * Unduh berkas dokumen pribadi warga.
 *
 * Kepemilikan diperiksa di use case dari `residentId` sesi, bukan parameter
 * URL. Berkas berada di media privat dan tidak dapat diakses lewat route media
 * publik.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sesi Anda telah berakhir.", { status: 401 });
  if (user.residentId === null) return new Response("Bukan akun warga.", { status: 403 });

  const { id } = await params;
  const dokumenId = Number(id);
  if (!Number.isInteger(dokumenId) || dokumenId <= 0) {
    return new Response("Dokumen tidak valid.", { status: 400 });
  }

  try {
    const dokumen = await bacaBerkasDokumenWarga(dokumenId);
    const nama = dokumen.namaAsli.replace(/[^\w.\- ]+/g, "_") || "dokumen";

    const mime = dokumen.mime || "application/octet-stream";
    return new Response(new Uint8Array(dokumen.isi), {
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

    console.error("Gagal membaca dokumen warga:", error);
    return new Response("Gagal membaca berkas.", { status: 500 });
  }
}
