import { NextResponse } from "next/server";

import { getRekapKehadiranData } from "@/features/kehadiran/application/kehadiran-use-cases";
import { bacaParameterRekapKehadiran } from "@/features/kehadiran/domain/rekap";
import { toCsv } from "@/lib/csv";
import { penggunaRoute } from "@/lib/route-auth";

/**
 * Ekspor rekap kehadiran ke CSV.
 *
 * Tenant & izin diperiksa lewat sesi; `villageId` tidak pernah berasal dari URL.
 * Parameter yang tidak valid ditolak dengan 400 agar tidak jatuh ke rekap
 * seluruh riwayat.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parameter = bacaParameterRekapKehadiran(
    url.searchParams.get("tahun"),
    url.searchParams.get("bulan"),
  );
  if (!parameter.ok) {
    return new NextResponse(parameter.pesan, { status: 400 });
  }

  const { tahun, bulan } = parameter.parameter;

  const auth = await penggunaRoute();
  if (!auth.ok) return auth.respons;
  const user = auth.user;
  if (!user.villageId) {
    return new NextResponse("Tidak ada desa.", { status: 404 });
  }

  const rekap = await getRekapKehadiranData(user.villageId, tahun, bulan);

  const csvContent = `\uFEFF${toCsv([
    ["Perangkat", "Jabatan", "Hadir", "Izin", "Sakit", "Alpa"],
    ...rekap.map((item) => [
      item.nama,
      item.jabatan,
      String(item.hadir),
      String(item.izin),
      String(item.sakit),
      String(item.alpa),
    ]),
  ])}`;

  const namaBerkas = `rekap_kehadiran_${tahun}${bulan ? `_bulan_${bulan}` : ""}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
