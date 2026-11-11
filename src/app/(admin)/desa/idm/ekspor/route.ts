import { NextResponse } from "next/server";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { daftarIdm, daftarSdgs } from "@/features/idm/application/idm-use-cases";
import { buildLaporanIdmCsv, namaBerkasLaporanIdm } from "@/features/idm/domain/laporan-idm";
import { appErrorStatus, isAppError } from "@/lib/errors";
import { penggunaRoute } from "@/lib/route-auth";

/**
 * Ekspor CSV laporan IDM & SDGs.
 *
 * Data diambil lewat use case admin sehingga izin `idm`/`idm-sdgs` dan scoping
 * `villageId` dari sesi tetap berlaku.
 */
export async function GET(request: Request) {
  try {
    const auth = await penggunaRoute();
    if (!auth.ok) return auth.respons;
    const user = auth.user;
    const { searchParams } = new URL(request.url);
    const tahunParam = Number(searchParams.get("tahun") ?? "");
    const tahun =
      Number.isInteger(tahunParam) && tahunParam > 2000 ? tahunParam : new Date().getFullYear();
    const villageId = await resolveVillageId(user);

    const [indikator, sdgs] = await Promise.all([
      daftarIdm(villageId, tahun),
      daftarSdgs(villageId, tahun),
    ]);

    return new NextResponse(buildLaporanIdmCsv({ tahun, indikator, sdgs }), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${namaBerkasLaporanIdm(tahun)}"`,
      },
    });
  } catch (error) {
    const status = isAppError(error) ? appErrorStatus(error.code) : 500;
    return new NextResponse("Gagal menyusun laporan IDM.", { status });
  }
}
