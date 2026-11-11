import { NextResponse } from "next/server";

import { getBukuPembangunan } from "@/features/pembangunan/application/use-cases";
import {
  buildBukuPembangunan,
  buildBukuPembangunanCsv,
  namaBerkasBukuPembangunan,
} from "@/features/pembangunan/domain/buku-pembangunan";
import { appErrorStatus, isAppError } from "@/lib/errors";

/**
 * Ekspor CSV buku pembangunan.
 *
 * `?tahun=` opsional; tanpa parameter seluruh tahun anggaran diekspor. Izin dan
 * scoping tenant ditegakkan use case `getBukuPembangunan`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tahunParam = Number(searchParams.get("tahun") ?? "");
  const tahun = Number.isInteger(tahunParam) && tahunParam > 2000 ? tahunParam : null;

  try {
    const rows = await getBukuPembangunan(tahun);

    return new NextResponse(buildBukuPembangunanCsv(buildBukuPembangunan(rows)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${namaBerkasBukuPembangunan(tahun)}"`,
      },
    });
  } catch (error) {
    const status = isAppError(error) ? appErrorStatus(error.code) : 500;
    return new NextResponse("Gagal menyusun buku pembangunan.", { status });
  }
}
