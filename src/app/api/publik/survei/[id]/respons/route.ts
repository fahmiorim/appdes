import { NextResponse, type NextRequest } from "next/server";

import { alamatIp, BATAS_PER_MENIT } from "@/features/api-publik/application/public-api";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { simpanResponsPublikData } from "@/features/survey/application/use-cases";
import { verifikasiTokenFormEksternal } from "@/features/survey/domain/form-eksternal";
import { respondenFormSchema } from "@/features/survey/domain/survey";
import { env } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import { bacaJsonTerbatas, BodyLimitError } from "@/lib/request-body";

function galat(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * `POST /api/publik/survei/[id]/respons`
 *
 * Menerima respons dari formulir yang ditanam di situs lain. Desa tetap
 * ditentukan dari header `Host`, dan token HMAC membatasi formulir ke survei
 * yang dituju. Bila formulir dirender sebagai iframe di halaman publik desa,
 * token dibuat server-side oleh halaman tersebut.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const batas = await batasiPermintaan(`survei-eksternal:${alamatIp(request)}`, {
    batas: BATAS_PER_MENIT,
  });
  if (batas.dibatasi) return galat(429, "Terlalu banyak permintaan. Coba lagi beberapa saat.");

  const { id } = await context.params;
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId) || surveyId < 1) return galat(400, "Survei tidak valid.");

  let body: unknown;
  try {
    body = await bacaJsonTerbatas(request, 32_768);
  } catch (error) {
    if (error instanceof BodyLimitError) {
      return galat(413, "Badan permintaan terlalu besar.");
    }
    return galat(400, "Badan permintaan harus berupa JSON.");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return galat(400, "Badan permintaan harus berupa objek JSON.");
  }

  const data = body as {
    token?: unknown;
    nama?: unknown;
    nik?: unknown;
    jawaban?: unknown;
  };

  if (typeof data.token !== "string" || data.token.trim() === "") {
    return galat(401, "Token formulir wajib diisi.");
  }

  const statusToken = verifikasiTokenFormEksternal(env.BETTER_AUTH_SECRET, data.token, surveyId);
  if (statusToken !== "valid") {
    return galat(statusToken === "kedaluwarsa" ? 410 : 401, "Token formulir tidak valid.");
  }

  const parsed = respondenFormSchema.safeParse({
    surveyId,
    nama: typeof data.nama === "string" ? data.nama : "",
    nik: typeof data.nik === "string" ? data.nik : "",
  });

  if (!parsed.success) {
    return galat(400, parsed.error.issues[0]?.message ?? "Isian responden tidak valid.");
  }

  const jawabanRaw = data.jawaban;
  if (typeof jawabanRaw !== "object" || jawabanRaw === null || Array.isArray(jawabanRaw)) {
    return galat(400, "Field jawaban harus berupa objek.");
  }

  const jawaban: Record<string, string> = {};
  for (const [key, value] of Object.entries(jawabanRaw)) {
    if (typeof value === "string" || typeof value === "number") {
      jawaban[key] = String(value);
    }
  }

  try {
    const desa = await getIdentitasFromRequest();
    const hasil = await simpanResponsPublikData(
      desa.id,
      surveyId,
      { nama: parsed.data.nama, nik: parsed.data.nik || null },
      jawaban,
    );

    return NextResponse.json({ success: true, data: hasil }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      if (error.code === "NOT_FOUND") return galat(404, error.message);
      if (error.code === "VALIDATION") return galat(422, error.message);
      if (error.code === "FORBIDDEN" || error.code === "UNAUTHENTICATED") {
        return galat(403, "Anda tidak memiliki hak akses.");
      }
    }
    console.error("Gagal menyimpan respons survei eksternal:", error);
    return galat(500, "Gagal menyimpan respons survei.");
  }
}
