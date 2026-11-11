import {
  buildKeluargaPdfData,
  getKeluargaPrintData,
} from "@/features/keluarga/application/use-cases";
import { KELUARGA_RESOURCE } from "@/features/keluarga/domain/keluarga";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";
import { isAppError } from "@/lib/errors";

/**
 * Unduh Kartu Keluarga sebagai PDF.
 *
 * Izin diperiksa ganda: di sini (agar respons 401/403 jelas) dan di use case
 * (agar aturan tetap berlaku bagi pemanggil lain). Nama berkas memakai nomor KK
 * yang sudah dibersihkan agar aman di header `Content-Disposition`.
 */
export async function GET(_request: Request, { params }: RouteContext<"/keluarga/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, KELUARGA_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const { id } = await params;
  const familyId = Number(id);
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return new Response("Kartu Keluarga tidak valid.", { status: 400 });
  }

  try {
    const [pdf, { keluarga }] = await Promise.all([
      buildKeluargaPdfData(familyId),
      getKeluargaPrintData(familyId),
    ]);

    const filename = `kartu-keluarga-${keluarga.number.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;

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

    console.error("Gagal membuat PDF Kartu Keluarga:", error);
    return new Response("Gagal membuat PDF Kartu Keluarga.", { status: 500 });
  }
}
