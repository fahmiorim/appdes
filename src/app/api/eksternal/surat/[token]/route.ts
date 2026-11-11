import type { NextRequest } from "next/server";

import { authenticateApiKey } from "@/features/api-eksternal/domain/auth";
import { jsonGalat } from "@/features/api-eksternal/presentation/respons";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { cariSuratEksternal } from "@/features/surat/application/verifikasi-publik";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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

  if (!/^[0-9a-f]{64}$/i.test(token)) return jsonGalat(400, "Invalid token format");

  let surat;
  try {
    surat = await cariSuratEksternal(auth.apiKey.villageId, token);
  } catch (error) {
    console.error("Gagal membaca surat via API eksternal:", error);
    return jsonGalat(500, "Gagal membaca surat.");
  }

  await recordAuditEvent({
    villageId: auth.apiKey.villageId,
    event: AUDIT_EVENTS.externalSuratGet,
    resource: "surat",
    details: { ditemukan: surat !== null },
  });

  if (!surat) return jsonGalat(404, "Surat tidak ditemukan");

  return Response.json({
    surat: {
      id: surat.id,
      nomor: surat.number,
      tanggalTerbit: surat.issuedAt,
      status: surat.status,
    },
  });
}
