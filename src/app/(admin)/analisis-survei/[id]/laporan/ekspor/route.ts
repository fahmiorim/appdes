import { getLaporanSkorData } from "@/features/survey/application/use-cases";
import { isAppError } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/analisis-survei/[id]/laporan/ekspor">,
) {
  const { id } = await params;
  const surveyId = Number(id);

  if (!Number.isInteger(surveyId) || surveyId <= 0) {
    return new Response("Survei tidak valid.", { status: 400 });
  }

  try {
    const data = await getLaporanSkorData(surveyId);

    const rows = [
      ["Nama", "NIK", "Skor", "Klasifikasi"],
      ...data.perResponden.map((r) => [r.nama ?? "", "", r.skor.toString(), r.klasifikasi]),
      [],
      ["Kategori", "Jumlah Indikator", "Rata-rata"],
      ...data.perKategori.map((k) => [
        k.kategori ?? "Tanpa kategori",
        k.jumlahIndikator.toString(),
        k.rataRata.toString(),
      ]),
      [],
      ["Indikator", "Kategori", "Rata-rata"],
      ...data.perIndikator.map((i) => [i.nama, i.kategori ?? "", i.rataRata.toString()]),
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const csv = "\uFEFF" + csvContent;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-skor-survei-${data.survei.judul.replace(/\s+/g, "-").toLowerCase()}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      if (error.code === "NOT_FOUND") return new Response(error.message, { status: 404 });
      if (error.code === "FORBIDDEN" || error.code === "UNAUTHENTICATED") {
        return new Response("Anda tidak memiliki hak akses.", { status: 403 });
      }
    }

    console.error("Gagal membuat ekspor laporan skor survei:", error);
    return new Response("Gagal membuat ekspor laporan skor survei.", { status: 500 });
  }
}
