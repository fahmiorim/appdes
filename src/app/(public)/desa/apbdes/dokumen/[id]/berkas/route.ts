import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getBerkasLaporanDokumenApbdesPublik } from "@/features/keuangan/application/laporan-dokumen-publik-use-cases";
import { isAppError } from "@/lib/errors";

/** Unduh berkas dokumen APBDes yang sudah diserahkan (akses publik per host). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/desa/apbdes/dokumen/[id]/berkas">,
) {
  const { id } = await params;
  const laporanId = Number(id);
  if (!Number.isInteger(laporanId) || laporanId <= 0) {
    return new Response("Dokumen laporan tidak valid.", { status: 400 });
  }

  try {
    const desa = await getIdentitasFromRequest();
    const { row, isi } = await getBerkasLaporanDokumenApbdesPublik(desa.id, laporanId);
    const namaAman = row.namaFile.replace(/["\r\n]/g, "");

    return new Response(Buffer.from(isi), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${namaAman}"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      return new Response(error.message, { status: 404 });
    }

    console.error("Gagal membaca berkas laporan APBDes publik:", error);
    return new Response("Gagal membaca berkas laporan.", { status: 500 });
  }
}
