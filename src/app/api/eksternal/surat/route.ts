import { NextResponse, type NextRequest } from "next/server";

import { authenticateApiKey } from "@/features/api-eksternal/domain/auth";
import { jsonGalat } from "@/features/api-eksternal/presentation/respons";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import {
  ajukanSuratEksternalData,
  suratEksternalSchema,
} from "@/features/layanan-mandiri/application/eksternal-use-cases";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { isAppError } from "@/lib/errors";
import { bacaBytesTerbatas, bacaJsonTerbatas, BodyLimitError } from "@/lib/request-body";

/** Batas badan multipart; berkas individual tetap divalidasi. */
const BATAS_BADAN = 40 * 1024 * 1024;
const BATAS_JSON = 64 * 1024;

function isFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    typeof (value as File).arrayBuffer === "function",
  );
}

async function bacaBerkas(form: FormData, field: string): Promise<BerkasUnggahan | null> {
  const value = form.get(field);
  if (!isFile(value) || value.size === 0) return null;

  return {
    nama: value.name,
    mime: value.type || null,
    ukuran: value.size,
    isi: new Uint8Array(await value.arrayBuffer()),
  };
}

function bacaIsian(form: FormData): Record<string, string> {
  const isian: Record<string, string> = {};
  const json = form.get("isian");
  if (typeof json === "string" && json.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string" || typeof value === "number") {
            isian[key] = String(value);
          }
        }
      }
    } catch {
      // Isian individual di bawah tetap diproses.
    }
  }

  for (const [key, value] of form.entries()) {
    if (key.startsWith("isian.") && typeof value === "string") {
      isian[key.slice("isian.".length)] = value;
    }
  }

  return isian;
}

/**
 * `POST /api/eksternal/surat`
 *
 * JSON: `{ nik, letterTypeId, isian?, noHpAktif?, keterangan? }`.
 * Multipart: field yang sama + `berkas` syarat dengan nama `syarat.<id>`
 * (isian boleh sebagai JSON `isian` atau field `isian.<kode>`).
 * Autentikasi `X-API-Key`; desa berasal dari kunci, bukan input klien.
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
  let body: unknown;
  let berkas = new Map<number, BerkasUnggahan>();

  if (contentType.includes("multipart/form-data")) {
    let bytes: ArrayBuffer;
    try {
      bytes = await bacaBytesTerbatas(request, BATAS_BADAN);
    } catch (error) {
      if (error instanceof BodyLimitError) return jsonGalat(413, "Badan permintaan terlalu besar.");
      return jsonGalat(400, "Badan multipart tidak dapat dibaca.");
    }

    let form: FormData;
    try {
      form = await new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": contentType },
        body: bytes,
      }).formData();
    } catch {
      return jsonGalat(400, "Badan multipart tidak dapat dibaca.");
    }

    for (const [key, value] of form.entries()) {
      if (!key.startsWith("syarat.") || !isFile(value)) continue;
      const id = Number(key.slice("syarat.".length));
      if (!Number.isInteger(id) || id < 1) continue;
      const item = await bacaBerkas(form, key);
      if (item) berkas.set(id, item);
    }

    body = {
      nik: form.get("nik"),
      letterTypeId: form.get("letterTypeId"),
      isian: bacaIsian(form),
      noHpAktif: form.get("noHpAktif"),
      keterangan: form.get("keterangan"),
    };
  } else {
    try {
      body = await bacaJsonTerbatas(request, BATAS_JSON);
    } catch (error) {
      if (error instanceof BodyLimitError) return jsonGalat(413, "Badan permintaan terlalu besar.");
      return jsonGalat(400, "Badan permintaan harus berupa JSON atau multipart.");
    }
    if (body === null || typeof body !== "object") {
      return jsonGalat(400, "Badan permintaan harus berupa JSON atau multipart.");
    }
    berkas = new Map();
  }

  const parsed = suratEksternalSchema.safeParse(body);
  if (!parsed.success) {
    return jsonGalat(400, "Data permohonan tidak valid.", parsed.error.issues[0]?.message);
  }

  try {
    const hasil = await ajukanSuratEksternalData(auth.apiKey.villageId, parsed.data, berkas);

    await recordAuditEvent({
      villageId: auth.apiKey.villageId,
      event: AUDIT_EVENTS.externalSuratCreate,
      resource: "permohonan-surat",
      resourceId: String(hasil.id),
      details: { letterTypeId: parsed.data.letterTypeId, jumlahBerkas: berkas.size },
    });

    return NextResponse.json({ ok: true, data: hasil }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      if (error.code === "NOT_FOUND") return jsonGalat(404, error.message);
      if (error.code === "VALIDATION") return jsonGalat(422, error.message);
    }
    console.error("Gagal membuat permohonan surat via API eksternal:", error);
    return jsonGalat(500, "Gagal membuat permohonan surat.");
  }
}
