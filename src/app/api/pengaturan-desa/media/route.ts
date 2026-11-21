import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { pengaturanDesa, villages } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

export const runtime="nodejs";
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function setting(villageId:number,key:string,value:string|null){if(value===null){await db.delete(pengaturanDesa).where(and(eq(pengaturanDesa.villageId,villageId),eq(pengaturanDesa.kunci,key)));return;}await db.insert(pengaturanDesa).values({villageId,kunci:key,nilai:JSON.stringify(value)}).onDuplicateKeyUpdate({set:{nilai:JSON.stringify(value)}});}
function handle(e:unknown){if(isAppError(e))return response({error:e.message},appErrorStatus(e.code));console.error("Unggah identitas desa gagal:",e);return response({error:e instanceof Error?e.message:"Unggah media gagal."},500);}
export async function POST(request:Request){
 try{
  const user=await requirePermission("pengaturan-desa","update"),villageId=await resolveVillageId(user),form=await request.formData();
  const field=form.get("field"),file=form.get("file");
  if(field!=="logo"&&field!=="favicon")return response({error:"Jenis media tidak valid."},400);
  if(!(file instanceof File)||file.size===0)return response({error:"Pilih berkas gambar terlebih dahulu."},400);
  if(field==="logo"&&file.size>2*1024*1024)return response({error:"Logo maksimal 2 MB."},413);
  if(field==="favicon"&&(file.size>1024*1024||file.type!=="image/png"))return response({error:"Favicon hanya PNG dengan ukuran maksimal 1 MB."},422);
  if(field==="logo"&&!["image/jpeg","image/png","image/svg+xml"].includes(file.type))return response({error:"Logo harus JPG, PNG, atau SVG."},422);
  const upload:BerkasUnggahan={nama:file.name,mime:file.type,ukuran:file.size,isi:new Uint8Array(await file.arrayBuffer())};
  const path=await simpanBerkasMedia(villageId,upload,"umum",field);
  let old:string|null=null;
  if(field==="logo"){
    const [v]=await db.select({logo:villages.logo}).from(villages).where(eq(villages.id,villageId)).limit(1);
    old=v?.logo??null;
    await db.update(villages).set({logo:path}).where(eq(villages.id,villageId));
  }else{
    const [v]=await db.select({nilai:pengaturanDesa.nilai}).from(pengaturanDesa).where(and(eq(pengaturanDesa.villageId,villageId),eq(pengaturanDesa.kunci,"pengaturan.favicon"))).limit(1);
    try{old=v?.nilai?JSON.parse(v.nilai) as string:null;}catch{old=null;}
    await setting(villageId,"pengaturan.favicon",path);
  }
  if(old&&old!==path)await hapusMedia(old);
  return response({message:field==="logo"?"Logo desa berhasil diunggah.":"Favicon berhasil diunggah.",path});
 }catch(e){return handle(e);}
}
export async function DELETE(request:Request){
 try{
  const user=await requirePermission("pengaturan-desa","update"),villageId=await resolveVillageId(user),field=new URL(request.url).searchParams.get("field");
  if(field==="logo"){
    const [v]=await db.select({logo:villages.logo}).from(villages).where(eq(villages.id,villageId)).limit(1);
    await db.update(villages).set({logo:null}).where(eq(villages.id,villageId));
    if(v?.logo)await hapusMedia(v.logo);
  }else if(field==="favicon"){
    const [v]=await db.select({nilai:pengaturanDesa.nilai}).from(pengaturanDesa).where(and(eq(pengaturanDesa.villageId,villageId),eq(pengaturanDesa.kunci,"pengaturan.favicon"))).limit(1);
    await setting(villageId,"pengaturan.favicon",null);
    try{const old=v?.nilai?JSON.parse(v.nilai) as string:null;if(old)await hapusMedia(old);}catch{}
  }else return response({error:"Jenis media tidak valid."},400);
  return response({message:"Media identitas berhasil dihapus."});
 }catch(e){return handle(e);}
}
