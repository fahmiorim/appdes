import { NextResponse } from "next/server";

import { buatSpesifikasiOpenApiEksternal } from "@/features/api-eksternal/domain/openapi";

/**
 * GET /api/eksternal/openapi
 *
 * Kontrak OpenAPI 3.1 untuk API mitra. Dokumen ini publik dan tidak memuat
 * rahasia; autentikasi tetap diperlukan untuk endpoint data.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json(buatSpesifikasiOpenApiEksternal(origin), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
