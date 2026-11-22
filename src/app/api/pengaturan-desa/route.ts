import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { layananPublik, pengaturanDesa, profilDesa, theme, villages, websiteTemplates } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";
import { bacaPengaturan, simpanPengaturanTenant } from "@/features/pengaturan/application/pengaturan-use-cases";
import { tokenTemplateSchema } from "@/features/multi-desa/domain/template-website";
import { hitungUkuranMedia } from "@/features/publik/infrastructure/media-storage";

export const runtime = "nodejs";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const kontakSchema = z.object({
    whatsapp: z.string().trim().max(30).default(""),
    telepon: z.string().trim().max(30).default(""),
    email: z.string().trim().max(100).default(""),
    alamat: z.string().trim().max(255).default(""),
    website: z.string().trim().max(255).default(""),
    instagram: z.string().trim().max(150).default(""),
    facebook: z.string().trim().max(255).default(""),
    youtube: z.string().trim().max(255).default(""),
    koordinat: z.string().trim().max(60).default(""),
    tautanPeta: z.string().trim().max(500).default(""),
    jamLayanan: z.string().trim().max(150).default(""),
  });
const integrasiSchema = z.object({
    webhookUrl: z.string().trim().max(500).default(""),
    webhookAktif: z.boolean().default(false),
    endpointEksternal: z.string().trim().max(500).default(""),
    catatan: z.string().trim().max(1000).default(""),
  });
const umumSchema = z.object({
    komentarAktif: z.boolean(),
    beritaBeranda: z.coerce.number().int().min(1).max(12),
    pendaftaranWargaAktif: z.boolean(),
    penomoranSurat: z.coerce.number().int().min(1).max(4),
  });
async function simpanNilai(villageId:number,key:string,value:unknown) {
  await db.insert(pengaturanDesa).values({villageId,kunci:key,nilai:JSON.stringify(value)}).onDuplicateKeyUpdate({set:{nilai:JSON.stringify(value)}});
}
async function bacaNilai(villageId:number,key:string) {
  const [row]=await db.select({nilai:pengaturanDesa.nilai}).from(pengaturanDesa).where(and(eq(pengaturanDesa.villageId,villageId),eq(pengaturanDesa.kunci,key))).limit(1);
  if(!row?.nilai)return null;
  try{return JSON.parse(row.nilai) as unknown;}catch{return null;}
}
function handleError(error:unknown) {
  if(isAppError(error)) return json({error:error.message},appErrorStatus(error.code));
  console.error("Pengaturan desa gagal diproses:",error);
  return json({error:"Pengaturan desa gagal diproses."},500);
}
export async function GET() {
  try {
    const user=await requirePermission("pengaturan-desa","read"), villageId=await resolveVillageId(user);
    const [[desa],[profil],layanan,settings,templates,[activeTheme],general,mediaUsage,[mediaQuota]]=await Promise.all([
      db.select({id:villages.id,namaDesa:villages.name,kodeDesa:villages.code,namaKecamatan:villages.district,namaKabupaten:villages.regency,namaPropinsi:villages.province,kodePos:villages.postalCode,alamat:villages.officeAddress,email:villages.email,telepon:villages.phone,website:villages.website,logo:villages.logo,namaKepalaDesa:villages.headName,nipKepalaDesa:villages.headNip,updatedAt:villages.updatedAt}).from(villages).where(eq(villages.id,villageId)).limit(1),
      db.select().from(profilDesa).where(eq(profilDesa.villageId,villageId)).limit(1),
      db.select({id:layananPublik.id,nama:layananPublik.nama,kategori:layananPublik.kategori,deskripsi:layananPublik.deskripsi,persyaratan:layananPublik.persyaratan,estimasiHari:layananPublik.estimasiHari,biaya:layananPublik.biaya,metode:layananPublik.metode,aktif:layananPublik.aktif}).from(layananPublik).where(eq(layananPublik.villageId,villageId)).orderBy(asc(layananPublik.nama)),
      Promise.all([bacaNilai(villageId,"pengaturan.kontak"),bacaNilai(villageId,"pengaturan.integrasi"),bacaNilai(villageId,"pengaturan.favicon")]),
      db.select({id:websiteTemplates.id,slug:websiteTemplates.slug,nama:websiteTemplates.name,kategori:websiteTemplates.category,deskripsi:websiteTemplates.description,versi:websiteTemplates.version,tokens:websiteTemplates.tokens,tags:websiteTemplates.tags}).from(websiteTemplates).where(eq(websiteTemplates.status,"published")).orderBy(asc(websiteTemplates.name)),
      db.select({id:theme.id,slug:theme.slug,nama:theme.nama,versi:theme.versi,opsi:theme.opsi}).from(theme).where(and(eq(theme.villageId,villageId),eq(theme.aktif,true))).limit(1),
      bacaPengaturan(villageId),
      hitungUkuranMedia(villageId),
      db.select({kuotaMediaMb:villages.kuotaMediaMb}).from(villages).where(eq(villages.id,villageId)).limit(1),
    ]);
    return json({desa:desa??null,profil:profil??null,layanan,kontak:settings[0]??{},integrasi:settings[1]??{},favicon:settings[2],templates:templates.map(t=>({...t,tokens:(()=>{try{const parsed=tokenTemplateSchema.safeParse(JSON.parse(t.tokens));return parsed.success?parsed.data:{}}catch{return {}}})(),tags:(()=>{try{return JSON.parse(t.tags)}catch{return []}})()})),temaAktif:activeTheme??null,umum:general,media:{usedBytes:mediaUsage,quotaMb:mediaQuota?.kuotaMediaMb??null}})
  } catch(error){return handleError(error);}
}
export async function PUT(request:Request) {
  try {
    const user=await requirePermission("pengaturan-desa","update"), villageId=await resolveVillageId(user);
    const body=await request.json() as {section?:string;data?:unknown};
    if(body.section==="profil") {
      const s=z.object({namaDesa:z.string().trim().min(2).max(100),kodeDesa:z.string().trim().regex(/^\d{10}$/,"Kode desa harus 10 digit."),namaKecamatan:z.string().trim().min(2).max(100),namaKabupaten:z.string().trim().min(2).max(100),namaPropinsi:z.string().trim().min(2).max(100),kodePos:z.string().trim().regex(/^\d{5}$/,"Kode pos harus 5 digit.").or(z.literal("")),namaKepalaDesa:z.string().trim().max(100),nipKepalaDesa:z.string().trim().max(25),visi:z.string().trim().max(5000),misi:z.string().trim().max(10000),sejarah:z.string().trim().max(10000),sambutan:z.string().trim().max(5000)}).safeParse(body.data);
      if(!s.success)return json({error:s.error.issues[0]?.message??"Profil tidak valid."},422);
      const d=s.data;
      await db.transaction(async tx=>{
        await tx.update(villages).set({name:d.namaDesa,code:d.kodeDesa||null,district:d.namaKecamatan||null,regency:d.namaKabupaten||null,province:d.namaPropinsi||null,postalCode:d.kodePos||null,headName:d.namaKepalaDesa||null,headNip:d.nipKepalaDesa||null}).where(eq(villages.id,villageId));
        await tx.insert(profilDesa).values({villageId,visi:d.visi||null,misi:d.misi||null,sejarah:d.sejarah||null,sambutan:d.sambutan||null}).onDuplicateKeyUpdate({set:{visi:d.visi||null,misi:d.misi||null,sejarah:d.sejarah||null,sambutan:d.sambutan||null}});
      });
      return json({message:"Profil dan identitas desa berhasil disimpan."});
    }
    if(body.section==="kontak") {
      const s=kontakSchema.safeParse(body.data);
      if(!s.success)return json({error:s.error.issues[0]?.message??"Kontak tidak valid."},422);
      const d=s.data;
      if(d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))return json({error:"Format email desa tidak valid."},422);
      if(d.website){try{const u=new URL(d.website);if(!["https:","http:"].includes(u.protocol))throw new Error();}catch{return json({error:"Website desa harus berupa URL HTTP/HTTPS."},422);}}
      if(d.tautanPeta){try{const u=new URL(d.tautanPeta);if(!["https:","http:"].includes(u.protocol))throw new Error();}catch{return json({error:"Tautan peta harus berupa URL HTTP/HTTPS."},422);}}
      for (const number of [d.telepon,d.whatsapp]) {
        if(number && !/^[0-9+()\s-]{6,30}$/.test(number))return json({error:"Nomor telepon/WhatsApp tidak valid."},422);
      }
      if(d.koordinat){
        const parts=d.koordinat.split(",").map(value=>Number(value.trim()));
        if(parts.length!==2||!parts.every(Number.isFinite)||parts[0]<-90||parts[0]>90||parts[1]<-180||parts[1]>180)
          return json({error:"Koordinat harus berupa latitude (-90 s.d. 90), longitude (-180 s.d. 180)."},422);
      }
      await db.update(villages).set({phone:d.telepon||d.whatsapp||null,email:d.email||null,officeAddress:d.alamat||null,website:d.website||null}).where(eq(villages.id,villageId));
      await db.insert(profilDesa).values({villageId,koordinat:d.koordinat||null}).onDuplicateKeyUpdate({set:{koordinat:d.koordinat||null}});
      await simpanNilai(villageId,"pengaturan.kontak",d);
      return json({message:"Kontak dan lokasi berhasil disimpan."});
    }
    if(body.section==="integrasi") {
      const s=integrasiSchema.safeParse(body.data);
      if(!s.success)return json({error:s.error.issues[0]?.message??"Pengaturan integrasi tidak valid."},422);
      const d=s.data;
      for(const field of ["webhookUrl","endpointEksternal"] as const){const value=d[field];if(value){try{const u=new URL(value);if(!["https:","http:"].includes(u.protocol))throw new Error();}catch{return json({error:"URL integrasi harus menggunakan HTTP/HTTPS."},422);}}}
      await simpanNilai(villageId,"pengaturan.integrasi",d);
      return json({message:"Pengaturan integrasi berhasil disimpan."});
    }
    if(body.section==="umum") {
      const s=umumSchema.safeParse(body.data);
      if(!s.success)return json({error:s.error.issues[0]?.message??"Pengaturan umum tidak valid."},422);
      await simpanPengaturanTenant(villageId, s.data, user.id);
      return json({message:"Preferensi umum berhasil disimpan."});
    }
    if(body.section==="tampilan") {
      const s=z.object({templateSlug:z.string().trim().min(1).max(50)}).safeParse(body.data);
      if(!s.success)return json({error:"Template tidak valid."},422);
      const [template]=await db.select().from(websiteTemplates).where(and(eq(websiteTemplates.slug,s.data.templateSlug),eq(websiteTemplates.status,"published"))).limit(1);
      if(!template)return json({error:"Template tidak tersedia atau belum diterbitkan."},404);
      let rawTokens: unknown;
      try { rawTokens=JSON.parse(template.tokens); } catch { return json({error:"Token template tidak valid."},422); }
      const validatedTokens=tokenTemplateSchema.safeParse(rawTokens);
      if(!validatedTokens.success)return json({error:"Token template tidak sesuai skema tampilan."},422);
      const options={templateSlug:template.slug,templateTokens:validatedTokens.data};
      await db.transaction(async tx=>{
        const [currentActive]=await tx.select({opsi:theme.opsi}).from(theme).where(and(eq(theme.villageId,villageId),eq(theme.aktif,true))).limit(1);
        await tx.update(theme).set({aktif:false}).where(eq(theme.villageId,villageId));
        const [same]=await tx.select({id:theme.id,opsi:theme.opsi}).from(theme).where(and(eq(theme.villageId,villageId),eq(theme.slug,template.slug))).limit(1);
        if(same) {
          let previous: Record<string, unknown> = {};
          try {
            const rawPrevious = same.opsi ?? currentActive?.opsi;
            const parsed: unknown = rawPrevious ? JSON.parse(rawPrevious) : {};
            if(parsed && typeof parsed==="object" && !Array.isArray(parsed)) previous=parsed as Record<string,unknown>;
          } catch {}
          await tx.update(theme).set({nama:template.name,versi:template.version,aktif:true,opsi:JSON.stringify({...previous,...options})}).where(and(eq(theme.villageId,villageId),eq(theme.id,same.id)));
        }
        else {
          let previous: Record<string, unknown> = {};
          try { const parsed: unknown = currentActive?.opsi ? JSON.parse(currentActive.opsi) : {}; if(parsed && typeof parsed==="object" && !Array.isArray(parsed)) previous=parsed as Record<string,unknown>; } catch {}
          await tx.insert(theme).values({villageId,slug:template.slug,nama:template.name,versi:template.version,aktif:true,opsi:JSON.stringify({...previous,...options})});
        }
      });
      await simpanNilai(villageId,"pengaturan.template",template.slug);
      return json({message:"Preferensi template website berhasil diterapkan. Tampilan menggunakan komponen website publik FlexiDes dengan token tema yang dipilih."});
    }
    return json({error:"Bagian pengaturan tidak dikenal."},400);
  } catch(error){return handleError(error);}
}
