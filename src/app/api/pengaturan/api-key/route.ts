import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  buatKunciApi,
  cabutKunciApi,
  daftarKunciApi,
} from "@/features/api-eksternal/application/api-key-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";
import { bacaJsonTerbatas, BodyLimitError } from "@/lib/request-body";

const BATAS_BODY = 8_192;

function galat(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: appErrorStatus(error.code) },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: error.issues[0]?.message ?? "Data tidak valid." },
      { status: 422 },
    );
  }

  console.error("Gagal memproses kunci API:", error);
  return NextResponse.json({ ok: false, error: "Gagal memproses kunci API." }, { status: 500 });
}

export async function GET() {
  try {
    const data = await daftarKunciApi();
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return galat(error);
  }
}

/**
 * `DELETE /api/pengaturan/api-key?id=123`
 *
 * Menonaktifkan kunci tanpa menghapus barisnya, sehingga kunci yang bocor bisa
 * langsung dimatikan dan jejak auditnya tetap ada.
 */
export async function DELETE(request: Request) {
  const idMentah = new URL(request.url).searchParams.get("id");
  const id = idMentah === null ? Number.NaN : Number(idMentah);

  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { ok: false, error: "Parameter id wajib berupa bilangan bulat positif." },
      { status: 400 },
    );
  }

  try {
    const data = await cabutKunciApi(id);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return galat(error);
  }
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await bacaJsonTerbatas(request, BATAS_BODY);
  } catch (error) {
    if (error instanceof BodyLimitError) {
      return NextResponse.json({ ok: false, error: "Body terlalu besar." }, { status: 413 });
    }
    return NextResponse.json({ ok: false, error: "Body JSON tidak valid." }, { status: 400 });
  }

  try {
    const data = await buatKunciApi(input);
    return NextResponse.json(
      { ok: true, data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return galat(error);
  }
}
