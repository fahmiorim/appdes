import type { NextRequest } from "next/server";

import { authenticateApiKey } from "@/features/api-eksternal/domain/auth";
import { jsonGalat } from "@/features/api-eksternal/presentation/respons";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { tandatanganiPdfTte } from "@/features/surat/application/tte-use-cases";
import { adalahPdf } from "@/features/surat/domain/tte";
import { bacaBytesTerbatas, BodyLimitError } from "@/lib/request-body";

/** Batas ukuran berkas PDF yang diterima API eksternal (20 MB). */
const BATAS_PDF = 20 * 1024 * 1024;
const BATAS_MULTIPART = BATAS_PDF + 2 * 1024 * 1024;

/**
 * `POST /api/eksternal/tte/tanda-tangan`
 *
 * Form-data:
 * - `berkas` (wajib): berkas PDF yang akan ditandatangani;
 * - `nomor` (opsional): nomor surat untuk metadata.
 *
 * Autentikasi: header `X-API-Key` (API key per desa, DB-backed).
 * Rate limit dan audit mengikuti kontrak API eksternal bersama.
 */
export async function POST(request: NextRequest) {
  const apiKeyHeader = request.headers.get("X-API-Key");
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

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonGalat(415, "Gunakan multipart/form-data dengan field berkas.");
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await bacaBytesTerbatas(request, BATAS_MULTIPART);
  } catch (error) {
    if (error instanceof BodyLimitError) {
      return jsonGalat(413, "Badan permintaan terlalu besar.");
    }
    return jsonGalat(400, "Badan permintaan tidak dapat dibaca.");
  }

  let form: FormData;
  try {
    form = await new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": contentType },
      body: bytes,
    }).formData();
  } catch {
    return jsonGalat(400, "Badan permintaan tidak dapat dibaca.");
  }

  const berkas = form.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return jsonGalat(400, "Berkas PDF wajib diunggah pada field berkas.");
  }
  if (berkas.size > BATAS_PDF) {
    return jsonGalat(413, "Ukuran berkas melebihi 20 MB.");
  }

  const pdf = new Uint8Array(await berkas.arrayBuffer());
  if (!adalahPdf(pdf)) {
    return jsonGalat(415, "Berkas yang dikirim bukan PDF.");
  }

  const nomorRaw = form.get("nomor");
  const nomor =
    typeof nomorRaw === "string" && nomorRaw.trim() !== "" ? nomorRaw.trim().slice(0, 50) : "API";

  const hasil = await tandatanganiPdfTte({
    villageId: auth.apiKey.villageId,
    suratId: 0,
    nomor,
    pdf,
  });

  await recordAuditEvent({
    villageId: auth.apiKey.villageId,
    event: AUDIT_EVENTS.externalTteSign,
    resource: "surat-tte",
    details: { nomor, ok: hasil.ok },
  });

  if (!hasil.ok) {
    return jsonGalat(422, "Tanda tangan elektronik tidak dapat diproses.", hasil.alasan);
  }

  const filename = `tte-${nomor.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;
  return new Response(Buffer.from(hasil.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
