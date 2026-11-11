import { NextResponse } from "next/server";

import { requireUser, type CurrentUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

/**
 * Ambil pengguna aktif untuk Route Handler.
 *
 * Berbeda dari `verifySession` (yang mengalihkan ke halaman masuk), helper ini
 * mengembalikan respons 401/403 berformat JSON sehingga pemanggil `fetch` dari
 * luar halaman tidak menerima HTML hasil redirect. Semua route handler baru
 * sebaiknya memakai helper ini, bukan `verifySession`.
 */
export type HasilAuthRoute = { ok: true; user: CurrentUser } | { ok: false; respons: NextResponse };

export async function penggunaRoute(): Promise<HasilAuthRoute> {
  try {
    return { ok: true, user: await requireUser() };
  } catch (error) {
    const status = isAppError(error) ? appErrorStatus(error.code) : 401;
    return {
      ok: false,
      respons: new NextResponse("Sesi Anda telah berakhir.", { status }),
    };
  }
}
