import { NextResponse } from "next/server";

import { getFaviconPublik } from "@/features/pengaturan/application/pengaturan-desa-use-cases";
import { bacaBerkasMediaPublik } from "@/features/publik/application/media-publik";
import { isAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { path } = await getFaviconPublik();
    if (!path) return new Response(null, { status: 404 });
    const bytes = await bacaBerkasMediaPublik(path);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
        Vary: "Host",
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") return new Response(null, { status: 404 });
    return NextResponse.json({ error: "Favicon tidak tersedia." }, { status: 404 });
  }
}
