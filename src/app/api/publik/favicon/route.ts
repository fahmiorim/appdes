import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { pengaturanDesa } from "@/db/schema";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { isAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const desa = await getIdentitasFromRequest();
    const [row] = await db
      .select({ nilai: pengaturanDesa.nilai })
      .from(pengaturanDesa)
      .where(
        and(eq(pengaturanDesa.villageId, desa.id), eq(pengaturanDesa.kunci, "pengaturan.favicon")),
      )
      .limit(1);
    let path: string | null = null;
    try {
      path = row?.nilai ? (JSON.parse(row.nilai) as string) : null;
    } catch {
      path = null;
    }
    if (!path || !path.startsWith(`${desa.id}/umum/`) || path.includes(".."))
      return new Response(null, { status: 404 });
    const bytes = await bacaMedia(path);
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
