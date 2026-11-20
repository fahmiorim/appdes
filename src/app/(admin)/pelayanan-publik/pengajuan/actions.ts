"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ubahStatusPengajuanData } from "@/features/pelayanan/application/pengajuan-use-cases";
export async function ubahStatusPengajuanAction(f:FormData){
 const id=Number(f.get("id"));if(!Number.isSafeInteger(id)||id<1)throw new Error("ID pengajuan tidak valid.");
 await ubahStatusPengajuanData(id,{status:String(f.get("status")??""),catatanPetugas:String(f.get("catatanPetugas")??""),alasanPenolakan:String(f.get("alasanPenolakan")??"")});
 revalidatePath("/pelayanan-publik/pengajuan");revalidatePath("/pelayanan-publik/pengajuan/"+id);redirect("/pelayanan-publik/pengajuan/"+id+"?tersimpan=1");
}
