import "server-only";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requireWargaAktif } from "@/lib/dal";
import { notFound } from "@/lib/errors";
import { getPengajuanLayanan, listRiwayatPengajuan } from "../infrastructure/pengajuan-repository";

export async function getPengajuanWargaDetailData(id:number) {
  const user=await requireWargaAktif();
  const villageId=await resolveVillageId(user);
  const row=await getPengajuanLayanan(villageId,id);
  if(!row || row.request.residentId!==user.residentId) throw notFound("Pengajuan tidak ditemukan.");
  const riwayat=await listRiwayatPengajuan(villageId,id);
  return {...row,riwayat};
}
