import { hasPermission } from "@/features/rbac/application/authorization";
import { getSuratPdfBytes } from "@/features/surat/application/surat-use-cases";
import { SURAT_RESOURCE } from "@/features/surat/domain/surat";
import { parseVarianCetak } from "@/features/surat/domain/varian-cetak";
import { getCurrentUser } from "@/lib/dal";
import { isAppError } from "@/lib/errors";

export async function GET(
  request: Request,
  { params }: RouteContext<"/persuratan/surat/[id]/pdf">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, SURAT_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const { id } = await params;
  const suratId = Number(id);
  if (!Number.isInteger(suratId) || suratId <= 0) {
    return new Response("Surat tidak valid.", { status: 400 });
  }

  try {
    const varian = parseVarianCetak(new URL(request.url).searchParams.get("varian") ?? undefined);
    const { surat, pdf } = await getSuratPdfBytes(suratId, varian);
    const filename = `surat-${(surat.number ?? String(surat.id)).replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      return new Response(error.message, { status: 404 });
    }

    console.error("Gagal membuat PDF surat:", error);
    return new Response("Gagal membuat PDF surat.", { status: 500 });
  }
}
