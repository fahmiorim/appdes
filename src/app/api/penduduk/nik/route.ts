import { NextResponse } from "next/server";

import { cariPendudukByNikData } from "@/features/penduduk/application/use-cases";
import { getCurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";
import { privateNoStore } from "@/lib/response-headers";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return privateNoStore(
      new Response("Sesi Anda telah berakhir.", { status: 401 }),
    );
  }

  try {
    const url = new URL(request.url);
    const nik = url.searchParams.get("nik")?.trim();
    if (!nik || !/^\\d{16}$/.test(nik)) {
      return privateNoStore(
        NextResponse.json(
          { ok: false, message: "NIK harus 16 digit." },
          { status: 400 },
        ),
      );
    }

    const matched = await cariPendudukByNikData(nik);

    if (!matched) {
      return privateNoStore(
        NextResponse.json(
          { ok: false, message: "NIK tidak ditemukan." },
          { status: 404 },
        ),
      );
    }

    return privateNoStore(NextResponse.json({ ok: true, resident: matched }));
  } catch (error) {
    if (isAppError(error)) {
      return privateNoStore(
        NextResponse.json(
          { ok: false, message: error.message },
          { status: appErrorStatus(error.code) },
        ),
      );
    }
    console.error("Gagal lookup NIK:", error);
    return privateNoStore(
      NextResponse.json(
        { ok: false, message: "Server error" },
        { status: 500 },
      ),
    );
  }
}
