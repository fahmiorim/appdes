import { getLaporanKeuanganDokumenBerkas } from "@/features/keuangan/application/laporan-dokumen-use-cases";
import { LAPORAN_KEUANGAN_RESOURCE } from "@/features/keuangan/domain/keuangan";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getCurrentUser } from "@/lib/dal";
import { isAppError } from "@/lib/errors";

/** Unduh berkas PDF dokumen laporan APBDes. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/keuangan/laporan-dokumen/[id]/berkas">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sesi Anda telah berakhir.", { status: 401 });
  }
  if (!hasPermission(user.permissions, LAPORAN_KEUANGAN_RESOURCE, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const { id } = await params;
  const laporanId = Number(id);
  if (!Number.isInteger(laporanId) || laporanId <= 0) {
    return new Response("Dokumen laporan tidak valid.", { status: 400 });
  }

  try {
    const { row, isi } = await getLaporanKeuanganDokumenBerkas(laporanId);

    const unduh = new URL(request.url).searchParams.get("unduh") === "1";
    const disposisi = unduh ? "attachment" : "inline";

    return new Response(Buffer.from(isi), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposisi}; filename="${row.namaFile.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      return new Response(error.message, { status: 404 });
    }

    console.error("Gagal membaca berkas laporan keuangan:", error);
    return new Response("Gagal membaca berkas laporan.", { status: 500 });
  }
}
