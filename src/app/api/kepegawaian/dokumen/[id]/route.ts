import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { kepegawaianDokumen } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { requirePermission } from "@/lib/dal";

const MIME:Record<string,string>={pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id:raw}=await params;
    const id=Number(raw);
    if(!Number.isSafeInteger(id)||id<1) return NextResponse.json({error:"Dokumen tidak ditemukan."},{status:404});
    const user=await requirePermission("kepegawaian","read");
    const villageId=await resolveVillageId(user);
    const [document]=await db.select().from(kepegawaianDokumen)
      .where(and(eq(kepegawaianDokumen.villageId,villageId),eq(kepegawaianDokumen.id,id))).limit(1);
    if(!document) return NextResponse.json({error:"Dokumen tidak ditemukan."},{status:404});
    const buffer=await bacaMedia(document.berkas);
    const extension=document.berkas.split(".").pop()?.toLowerCase()??"";
    const mime=MIME[extension]??"application/octet-stream";
    return new Response(new Uint8Array(buffer),{headers:{
      "Content-Type":mime,
      "Content-Disposition":`attachment; filename="dokumen-${document.id}.${extension}"`,
      "Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff",
    }});
  } catch {
    return NextResponse.json({error:"Tidak dapat mengakses dokumen."},{status:403});
  }
}
