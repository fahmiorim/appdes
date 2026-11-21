import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { layananPublik } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

const schema=z.object({
  nama:z.string().trim().min(2).max(180),
  kategori:z.string().trim().min(2).max(60).default("administrasi"),
  deskripsi:z.string().trim().max(3000).default(""),
  persyaratan:z.string().trim().max(5000).default(""),
  estimasiHari:z.coerce.number().int().min(0).max(365).default(1),
  biaya:z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  metode:z.enum(["online","langsung","online_dan_langsung"]).default("online_dan_langsung"),
  aktif:z.boolean().default(true),
});
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
function error(e:unknown){if(isAppError(e))return response({error:e.message},appErrorStatus(e.code));console.error("Pengaturan layanan desa gagal:",e);return response({error:"Pengaturan layanan gagal diproses."},500);}
export async function GET(){
 try{const user=await requirePermission("pengaturan-desa","read"),villageId=await resolveVillageId(user);
 const data=await db.select().from(layananPublik).where(eq(layananPublik.villageId,villageId)).orderBy(asc(layananPublik.nama));
 return response({data});}catch(e){return error(e);}
}
export async function POST(request:Request){
 try{const user=await requirePermission("pengaturan-desa","update"),villageId=await resolveVillageId(user),body=await request.json(),parsed=schema.safeParse(body);
 if(!parsed.success)return response({error:parsed.error.issues[0]?.message??"Data layanan tidak valid."},422);
 const d=parsed.data;const [created]=await db.insert(layananPublik).values({villageId,nama:d.nama,kategori:d.kategori,deskripsi:d.deskripsi||null,persyaratan:d.persyaratan||null,estimasiHari:d.estimasiHari,biaya:d.biaya,metode:d.metode,aktif:d.aktif}).$returningId();
 return response({message:"Layanan berhasil ditambahkan.",id:created?.id},201);
 }catch(e){return error(e);}
}
export async function PUT(request:Request){
 try{const user=await requirePermission("pengaturan-desa","update"),villageId=await resolveVillageId(user),body=await request.json(),id=Number(body.id),parsed=schema.safeParse(body.data);
 if(!Number.isInteger(id)||id<1)return response({error:"ID layanan tidak valid."},400);
 if(!parsed.success)return response({error:parsed.error.issues[0]?.message??"Data layanan tidak valid."},422);
 const d=parsed.data,result=await db.update(layananPublik).set({nama:d.nama,kategori:d.kategori,deskripsi:d.deskripsi||null,persyaratan:d.persyaratan||null,estimasiHari:d.estimasiHari,biaya:d.biaya,metode:d.metode,aktif:d.aktif}).where(and(eq(layananPublik.id,id),eq(layananPublik.villageId,villageId)));
 if(!result.affectedRows)return response({error:"Layanan tidak ditemukan."},404);
 return response({message:"Layanan berhasil diperbarui."});
 }catch(e){return error(e);}
}
export async function DELETE(request:Request){
 try{const user=await requirePermission("pengaturan-desa","delete"),villageId=await resolveVillageId(user),id=Number(new URL(request.url).searchParams.get("id"));
 if(!Number.isInteger(id)||id<1)return response({error:"ID layanan tidak valid."},400);
 const result=await db.delete(layananPublik).where(and(eq(layananPublik.id,id),eq(layananPublik.villageId,villageId)));
 if(!result.affectedRows)return response({error:"Layanan tidak ditemukan."},404);
 return response({message:"Layanan berhasil dihapus."});
 }catch(e){return error(e);}
}
