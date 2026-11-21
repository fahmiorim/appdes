import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cutiPegawai } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { requirePermission } from "@/lib/dal";

const MIME:Record<string,string>={pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const id=Number((await params).id);
    if(!Number.isSafeInteger(id)||id<1) return NextResponse.json({error:"Lampiran tidak ditemukan."},{status:404});
    const user=await requirePermission("cuti-izin","read");
    const villageId=await resolveVillageId(user);
    const [request]=await db.select({lampiran:cutiPegawai.lampiran}).from(cutiPegawai)
      .where(and(eq(cutiPegawai.villageId,villageId),eq(cutiPegawai.id,id))).limit(1);
    if(!request?.lampiran) return NextResponse.json({error:"Lampiran tidak ditemukan."},{status:404});
    const buffer=await bacaMedia(request.lampiran);
    const ext=request.lampiran.split(".").pop()?.toLowerCase()??"";
    return new Response(new Uint8Array(buffer),{headers:{
      "Content-Type":MIME[ext]??"application/octet-stream",
      "Content-Disposition":`attachment; filename="lampiran-cuti-${id}.${ext}"`,
      "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
    }});
  } catch {
    return NextResponse.json({error:"Tidak dapat mengakses lampiran."},{status:403});
  }
}
