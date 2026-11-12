import { NextResponse } from "next/server";

import { getLaporanAnggota } from "@/features/kelompok/application/use-cases";
import { KELOMPOK_TIPE, type KelompokTipe } from "@/features/kelompok/domain/kelompok";
import {
  buildLaporanAnggotaCsv,
  namaBerkasLaporanAnggota,
} from "@/features/kelompok/domain/laporan-anggota";
import { appErrorStatus, isAppError } from "@/lib/errors";
import { privateNoStore } from "@/lib/response-headers";

/**
 * Ekspor CSV laporan anggota kelompok & lembaga.
 *
 * Otorisasi ditegakkan use case (`getLaporanAnggota`), jadi route ini tidak perlu
 * memeriksa izin sendiri; galat aplikasi dipetakan ke status HTTP yang sesuai.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipeParam = searchParams.get("tipe") ?? "";
  const tipe: KelompokTipe | "" = KELOMPOK_TIPE.includes(tipeParam as KelompokTipe)
    ? (tipeParam as KelompokTipe)
    : "";

  try {
    const rows = await getLaporanAnggota(tipe);

    return privateNoStore(
      new NextResponse(buildLaporanAnggotaCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${namaBerkasLaporanAnggota(tipe)}"`,
        },
      }),
    );
  } catch (error) {
    const status = isAppError(error) ? appErrorStatus(error.code) : 500;
    return privateNoStore(new NextResponse("Gagal menyusun laporan anggota.", { status }));
  }
}
