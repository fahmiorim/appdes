import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { jalankanApiPublik } from "@/features/api-publik/application/public-api";
import { listJenisSuratPublik } from "@/features/surat/application/surat-publik-use-cases";

/**
 * GET /api/publik/surat
 *
 * Agenda kegiatan desa yang ditayangkan dan jenis surat yang dapat diverifikasi.
 * Query: `limit` (1–100, default 20).
 *
 * Agenda surat masuk/keluar tidak diekspos: nomor surat dan asal/tujuan
 * instansi adalah metadata internal.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const diminta = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isInteger(diminta) && diminta > 0 ? Math.min(diminta, 100) : 20;

  return jalankanApiPublik(request, "surat", async (desa) => {
    const [agenda, jenisSurat] = await Promise.all([
      agendaMendatang(desa.id, limit),
      listJenisSuratPublik(desa.id),
    ]);

    return { agenda, jenisSurat };
  });
}
