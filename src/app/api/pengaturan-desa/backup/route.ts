import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { layananPublik, pengaturanDesa, profilDesa, theme, villages } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";
import { ambilPengaturanAdmin, simpanPengaturanAdmin } from "@/features/pengaturan/application/pengaturan-use-cases";

export const runtime="nodejs";
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function readSetting(villageId:number,key:string){const [r]=await db.select({nilai:pengaturanDesa.nilai}).from(pengaturanDesa).where(and(eq(pengaturanDesa.villageId,villageId),eq(pengaturanDesa.kunci,key))).limit(1);try{return r?.nilai?JSON.parse(r.nilai):null}catch{return null}}
function handle(e:unknown){if(isAppError(e))return response({error:e.message},appErrorStatus(e.code));console.error("Backup konfigurasi desa gagal:",e);return response({error:"Backup konfigurasi gagal diproses."},500);}
export async function GET(){
 try{
  const user=await requirePermission("pengaturan-desa","read"),villageId=await resolveVillageId(user);
  const [[desa],[profil],settings,layanan,tema,umum]=await Promise.all([
   db.select({nama:villages.name,kode:villages.code,kecamatan:villages.district,kabupaten:villages.regency,provinsi:villages.province,kodePos:villages.postalCode,alamat:villages.officeAddress,email:villages.email,telepon:villages.phone,website:villages.website,logo:villages.logo,kepalaDesa:villages.headName,nip:villages.headNip}).from(villages).where(eq(villages.id,villageId)).limit(1),
   db.select().from(profilDesa).where(eq(profilDesa.villageId,villageId)).limit(1),
   Promise.all(["pengaturan.kontak","pengaturan.integrasi","pengaturan.favicon","pengaturan.template"].map(k=>readSetting(villageId,k))),
   db.select().from(layananPublik).where(eq(layananPublik.villageId,villageId)),
   db.select({slug:theme.slug,nama:theme.nama,versi:theme.versi,opsi:theme.opsi,aktif:theme.aktif}).from(theme).where(and(eq(theme.villageId,villageId),eq(theme.aktif,true))).limit(1),
   ambilPengaturanAdmin(),
  ]);
  const backup={format:"flexidesa-village-settings",version:1,createdAt:new Date().toISOString(),scope:"Konfigurasi desa, profil publik, layanan desa, dan preferensi website. Bukan backup seluruh transaksi aplikasi.",desa,profil:profil??null,kontak:settings[0],integrasi:settings[1],favicon:settings[2],template:settings[3],layanan,tema:tema[0]??null,umum};
  return new Response(JSON.stringify(backup,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="flexidesa-konfigurasi-desa-${villageId}-${new Date().toISOString().slice(0,10)}.json"`,"Cache-Control":"private, no-store"}});
 }catch(e){return handle(e);}
}
const restoreSchema=z.object({
 format:z.literal("flexidesa-village-settings"),version:z.literal(1),
 profil:z.object({visi:z.string().nullable().optional(),misi:z.string().nullable().optional(),sejarah:z.string().nullable().optional(),sambutan:z.string().nullable().optional(),koordinat:z.string().nullable().optional(),luasWilayah:z.string().nullable().optional(),batasUtara:z.string().nullable().optional(),batasSelatan:z.string().nullable().optional(),batasTimur:z.string().nullable().optional(),batasBarat:z.string().nullable().optional(),ketinggian:z.string().nullable().optional(),suhuRataRata:z.string().nullable().optional(),curahHujan:z.string().nullable().optional(),topografi:z.string().nullable().optional()}).nullable().optional(),
 kontak:z.unknown().optional(),integrasi:z.unknown().optional(),favicon:z.unknown().optional(),template:z.unknown().optional(),
 umum:z.object({komentarAktif:z.boolean(),beritaBeranda:z.number().int().min(1).max(12),pendaftaranWargaAktif:z.boolean(),penomoranSurat:z.number().int().min(1).max(4)}).optional(),
});
export async function POST(request:Request){
 try{
  const user=await requirePermission("pengaturan-desa","update"),villageId=await resolveVillageId(user);
  const raw=await request.text();if(raw.length>2_000_000)return response({error:"Berkas backup maksimal 2 MB."},413);
  let parsedJson:unknown;try{parsedJson=JSON.parse(raw)}catch{return response({error:"Berkas JSON tidak valid."},400);}
  const parsed=restoreSchema.safeParse(parsedJson);if(!parsed.success)return response({error:parsed.error.issues[0]?.message??"Format backup tidak sesuai."},422);
  const b=parsed.data;
  await db.transaction(async tx=>{
   if(b.profil){await tx.insert(profilDesa).values({villageId,...b.profil}).onDuplicateKeyUpdate({set:{...b.profil}});}
   if(b.layanan){await tx.delete(layananPublik).where(eq(layananPublik.villageId,villageId));if(b.layanan.length)await tx.insert(layananPublik).values(b.layanan.map(item=>({villageId,...item})));}
   for(const [key,value] of [["pengaturan.kontak",b.kontak],["pengaturan.integrasi",b.integrasi],["pengaturan.favicon",b.favicon],["pengaturan.template",b.template]] as const){
    if(value!==undefined)await tx.insert(pengaturanDesa).values({villageId,kunci:key,nilai:JSON.stringify(value)}).onDuplicateKeyUpdate({set:{nilai:JSON.stringify(value)}});
   }
  });
  if(b.umum)await simpanPengaturanAdmin(b.umum);
  return response({message:"Konfigurasi berhasil dipulihkan. Data transaksi, pengguna, dan isi berkas media tidak diubah."});
 }catch(e){return handle(e);}
}
