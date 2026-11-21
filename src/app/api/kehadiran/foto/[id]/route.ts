import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { kehadiranPerangkat, kepegawaianPegawai } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requireUser } from "@/lib/dal";

const MIME:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user=await requireUser();
    const villageId=await resolveVillageId(user);
    const {id:raw}=await params;
    const id=Number(raw);
    if(!Number.isSafeInteger(id)||id<1) return NextResponse.json({error:"Bukti absensi tidak ditemukan."},{status:404});
    const [row]=await db.select({foto:kehadiranPerangkat.fotoMasuk,email:kepegawaianPegawai.email})
      .from(kehadiranPerangkat)
      .innerJoin(kepegawaianPegawai,and(eq(kehadiranPerangkat.villageId,kepegawaianPegawai.villageId),eq(kehadiranPerangkat.pegawaiId,kepegawaianPegawai.id)))
      .where(and(eq(kehadiranPerangkat.villageId,villageId),eq(kehadiranPerangkat.id,id))).limit(1);
    if(!row?.foto) return NextResponse.json({error:"Bukti absensi tidak ditemukan."},{status:404});
    const canRead=hasPermission(user.permissions,"kehadiran","read");
    if(!canRead && row.email?.toLowerCase()!==user.email.toLowerCase()) return NextResponse.json({error:"Tidak memiliki akses."},{status:403});
    const bytes=await bacaMedia(row.foto);
    const extension=row.foto.split(".").pop()?.toLowerCase()??"";
    return new Response(new Uint8Array(bytes),{headers:{
      "Content-Type":MIME[extension]??"application/octet-stream",
      "Content-Disposition":`inline; filename="bukti-absensi-${id}.${extension}"`,
      "Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff",
    }});
  } catch {
    return NextResponse.json({error:"Tidak dapat mengakses bukti absensi."},{status:403});
  }
}
