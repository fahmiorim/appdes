import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pengajuanLayanan, layananPublik } from "@/db/schema";
import type { StatusPengajuanLayanan } from "../domain/pengajuan";
export async function listPengajuanLayanan(villageId:number,status?:string){
 const where=[eq(pengajuanLayanan.villageId,villageId)];
 if(status)where.push(eq(pengajuanLayanan.status,status));
 const [rows,totals]=await Promise.all([
 db.select({id:pengajuanLayanan.id,nomorTiket:pengajuanLayanan.nomorTiket,namaPemohon:pengajuanLayanan.namaPemohon,nik:pengajuanLayanan.nik,telepon:pengajuanLayanan.telepon,keperluan:pengajuanLayanan.keperluan,status:pengajuanLayanan.status,createdAt:pengajuanLayanan.createdAt,namaLayanan:layananPublik.nama}).from(pengajuanLayanan).leftJoin(layananPublik,and(eq(pengajuanLayanan.layananId,layananPublik.id),eq(layananPublik.villageId,villageId))).where(and(...where)).orderBy(desc(pengajuanLayanan.createdAt),desc(pengajuanLayanan.id)).limit(100),
 db.select({total:count()}).from(pengajuanLayanan).where(and(...where))
 ]);
 return {rows,total:Number(totals[0]?.total??0)};
}
export async function getPengajuanLayanan(villageId:number,id:number){
 const [row]=await db.select({request:pengajuanLayanan, namaLayanan:layananPublik.nama,estimasiHari:layananPublik.estimasiHari,biaya:layananPublik.biaya}).from(pengajuanLayanan).leftJoin(layananPublik,and(eq(pengajuanLayanan.layananId,layananPublik.id),eq(layananPublik.villageId,villageId))).where(and(eq(pengajuanLayanan.villageId,villageId),eq(pengajuanLayanan.id,id))).limit(1);
 return row??null;
}
export async function updateStatusPengajuan(villageId:number,id:number,petugasId:string,input:{status:StatusPengajuanLayanan;catatanPetugas:string;alasanPenolakan:string}){
 const now=new Date();
 const [r]=await db.update(pengajuanLayanan).set({status:input.status,catatanPetugas:input.catatanPetugas||null,alasanPenolakan:input.status==="ditolak"?input.alasanPenolakan:null,petugasId,diprosesPada:["diverifikasi","diproses"].includes(input.status)?now:undefined,selesaiPada:["selesai","ditolak"].includes(input.status)?now:null}).where(and(eq(pengajuanLayanan.villageId,villageId),eq(pengajuanLayanan.id,id)));
 return r.affectedRows>0;
}
