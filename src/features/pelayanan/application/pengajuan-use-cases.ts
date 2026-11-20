import "server-only";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";
import { PENGAJUAN_RESOURCE,statusPengajuanSchema } from "../domain/pengajuan";
import { getPengajuanLayanan,listPengajuanLayanan,updateStatusPengajuan } from "../infrastructure/pengajuan-repository";
export async function getPengajuanPageData(status?:string){
 const user=await requirePermission(PENGAJUAN_RESOURCE,"read");const villageId=await resolveVillageId(user);
 const data=await listPengajuanLayanan(villageId,status);
 return {...data,canUpdate:hasPermission(user.permissions,PENGAJUAN_RESOURCE,"update")};
}
export async function getPengajuanDetailData(id:number){
 const user=await requirePermission(PENGAJUAN_RESOURCE,"read");const villageId=await resolveVillageId(user);
 const row=await getPengajuanLayanan(villageId,id);if(!row)throw notFound("Pengajuan tidak ditemukan.");return row;
}
export async function ubahStatusPengajuanData(id:number,raw:unknown){
 const user=await requirePermission(PENGAJUAN_RESOURCE,"update");const villageId=await resolveVillageId(user);
 const parsed=statusPengajuanSchema.safeParse(raw);if(!parsed.success)throw validationError(parsed.error.issues[0]?.message??"Status pengajuan tidak valid.");
 if(!await getPengajuanLayanan(villageId,id))throw notFound("Pengajuan tidak ditemukan.");
 const ok=await updateStatusPengajuan(villageId,id,user.id,{...parsed.data});if(!ok)throw notFound("Pengajuan tidak ditemukan.");
}
