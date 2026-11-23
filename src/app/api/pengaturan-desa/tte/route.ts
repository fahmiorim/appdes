import { NextResponse } from "next/server";

import {
  getKonfigurasiTtePageData,
  simpanKonfigurasiTteData,
} from "@/features/surat/application/tte-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
function handle(error: unknown) {
  if (isAppError(error)) return response({ error: error.message }, appErrorStatus(error.code));
  console.error("Konfigurasi TTE gagal:", error);
  return response({ error: "Konfigurasi TTE gagal diproses." }, 500);
}
export async function GET() {
  try {
    return response(await getKonfigurasiTtePageData());
  } catch (error) {
    return handle(error);
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await simpanKonfigurasiTteData(body);
    return response({ message: "Konfigurasi TTE berhasil disimpan." });
  } catch (error) {
    return handle(error);
  }
}
