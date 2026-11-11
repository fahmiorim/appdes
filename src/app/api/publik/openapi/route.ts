import { NextResponse } from "next/server";

import { alamatIp, BATAS_PER_MENIT } from "@/features/api-publik/application/public-api";
import { buatSpesifikasiOpenApi } from "@/features/api-publik/domain/openapi";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";

/**
 * GET /api/publik/openapi
 *
 * Kontrak OpenAPI 3.1 untuk seluruh endpoint data publik. Tidak bergantung pada
 * tenant; URL server diambil dari origin permintaan.
 */
export async function GET(request: Request) {
  const batas = await batasiPermintaan(`openapi:${alamatIp(request)}`, { batas: BATAS_PER_MENIT });
  if (batas.dibatasi) {
    return NextResponse.json(
      { success: false, error: "Terlalu banyak permintaan. Coba lagi beberapa saat." },
      { status: 429 },
    );
  }

  const origin = new URL(request.url).origin;

  return NextResponse.json(buatSpesifikasiOpenApi(origin), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
