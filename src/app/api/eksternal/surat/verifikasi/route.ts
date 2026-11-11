import { NextResponse, type NextRequest } from "next/server";

import { authenticateApiKey } from "@/features/api-eksternal/domain/auth";
import { jsonGalat } from "@/features/api-eksternal/presentation/respons";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { cariSuratEksternal } from "@/features/surat/application/verifikasi-publik";
import { bacaJsonTerbatas, BodyLimitError } from "@/lib/request-body";

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get("X-API-Key");
  if (!apiKeyHeader) return jsonGalat(401, "API Key missing");

  const auth = await authenticateApiKey(apiKeyHeader);
  if (!auth.ok) return jsonGalat(auth.status, auth.message);

  if (
    (
      await batasiPermintaan(`api-eksternal:${auth.apiKey.id}`, {
        batas: Math.max(1, auth.apiKey.rateLimit),
      })
    ).dibatasi
  )
    return jsonGalat(429, "Rate limit exceeded");

  let body: unknown;
  try {
    body = await bacaJsonTerbatas(req, 8 * 1024);
  } catch (error) {
    if (error instanceof BodyLimitError) {
      return jsonGalat(413, "Body too large");
    }
    return jsonGalat(400, "Invalid JSON body");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonGalat(400, "Invalid JSON body");
  }

  const { token } = body as { token?: unknown };
  if (typeof token !== "string" || token.length === 0) {
    return jsonGalat(400, "Token missing");
  }
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return jsonGalat(400, "Invalid token format");
  }

  let surat;
  try {
    surat = await cariSuratEksternal(auth.apiKey.villageId, token);
  } catch (error) {
    console.error("Gagal memverifikasi surat via API eksternal:", error);
    return jsonGalat(500, "Gagal memverifikasi surat.");
  }

  await recordAuditEvent({
    villageId: auth.apiKey.villageId,
    event: AUDIT_EVENTS.externalSuratVerifikasi,
    resource: "surat",
    details: { ditemukan: surat !== null },
  });

  if (!surat) return jsonGalat(404, "Surat tidak ditemukan");

  return NextResponse.json({
    surat: {
      id: surat.id,
      nomor: surat.number,
      tanggalTerbit: surat.issuedAt,
      status: surat.status,
    },
  });
}
