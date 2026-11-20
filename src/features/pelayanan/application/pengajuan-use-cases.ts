import "server-only";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";
import { PENGAJUAN_RESOURCE,statusPengajuanSchema } from "../domain/pengajuan";
import { getPengajuanLayanan, listPengajuanLayanan, listRiwayatPengajuan, updateStatusPengajuan } from "../infrastructure/pengajuan-repository";
export async function getPengajuanPageData(status?:string){
 const user=await requirePermission(PENGAJUAN_RESOURCE,"read");const villageId=await resolveVillageId(user);
 const data=await listPengajuanLayanan(villageId,status);
 return {...data,canUpdate:hasPermission(user.permissions,PENGAJUAN_RESOURCE,"update")};
}
export async function getPengajuanDetailData(id:number){
 const user=await requirePermission(PENGAJUAN_RESOURCE,"read");const villageId=await resolveVillageId(user);
 const row=await getPengajuanLayanan(villageId,id);if(!row)throw notFound("Pengajuan tidak ditemukan.");const riwayat=await listRiwayatPengajuan(villageId,id);return {...row,riwayat};
}
export async function ubahStatusPengajuanData(id:number,raw:unknown){
 const user=await requirePermission(PENGAJUAN_RESOURCE,"update");const villageId=await resolveVillageId(user);
 const parsed=statusPengajuanSchema.safeParse(raw);if(!parsed.success)throw validationError(parsed.error.issues[0]?.message??"Status pengajuan tidak valid.");
 if(!await getPengajuanLayanan(villageId,id))throw notFound("Pengajuan tidak ditemukan.");
 const perubahan=await updateStatusPengajuan(villageId,id,user.id,{...parsed.data});
 const detail=await getPengajuanLayanan(villageId,id);
 if(detail?.request.residentId){const {findWargaEmailByResident}=await import("@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository");const {kirimNotifikasiWarga}=await import("@/features/notifikasi/application/kirim-notifikasi");const email=await findWargaEmailByResident(villageId,detail.request.residentId);await kirimNotifikasiWarga({villageId,residentId:detail.request.residentId,jenis:"pengajuan-layanan.status",subjek:"Pembaruan status pengajuan "+detail.request.nomorTiket,pesan:"Status pengajuan "+detail.request.nomorTiket+" berubah menjadi "+perubahan.statusBaru+". "+(parsed.data.catatanPetugas||parsed.data.alasanPenolakan||""),email,telepon:detail.request.telepon});}
}
