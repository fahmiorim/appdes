import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { isPublicPath } from "@/lib/public-paths";

/**
 * Proxy (dahulu "middleware") — Next.js 16.
 *
 * Perannya **hanya** optimistis: mengalihkan pengguna tanpa cookie sesi ke
 * halaman masuk lebih awal agar tidak sempat memuat halaman admin. Ini BUKAN
 * lapisan otorisasi — pemeriksaan sesi & izin yang sebenarnya tetap dilakukan
 * di server (Data Access Layer: `src/lib/dal.ts`), karena proxy dapat dilewati
 * (mis. saat memanggil Server Action/Route Handler secara langsung).
 *
 * Aturan rute publik ada di `src/lib/public-paths.ts` agar dapat diuji.
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (!isPublicPath(pathname) && !sessionCookie) {
    const url = new URL("/masuk", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Pengalihan pengguna yang sudah masuk ditangani halaman `/masuk` di server
  // karena proxy tidak dapat membedakan akun staf dan akun warga.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Semua rute kecuali: API, aset Next, favicon, dan berkas statis.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
