"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ajukanLayananWargaData } from "@/features/pelayanan/application/pengajuan-use-cases";

export async function ajukanLayananWargaAction(formData: FormData) {
  const serviceId = Number(formData.get("layananId"));
  if (!Number.isSafeInteger(serviceId) || serviceId < 1) throw new Error("Pilih layanan yang valid.");
  const selected = [...formData.entries()].map(([key,value]) => {
    const match = key.match(new RegExp("^berkas_" + serviceId + "_(\\d+)$"));
    return match && value instanceof File && value.size > 0 ? { index:Number(match[1]), file:value } : null;
  }).filter((item): item is {index:number;file:File} => item !== null).sort((a,b)=>a.index-b.index);
  const berkas = [];
  for (const item of selected) berkas.push({ nama:item.file.name, mime:item.file.type||null, ukuran:item.file.size, isi:new Uint8Array(await item.file.arrayBuffer()) });
  const hasil = await ajukanLayananWargaData({
    layananId: serviceId, keperluan: String(formData.get("keperluan") ?? ""),
    telepon: String(formData.get("telepon") ?? ""), email: String(formData.get("email") ?? ""),
  }, berkas);
  revalidatePath("/layanan-mandiri/beranda");
  redirect("/layanan-mandiri/pengajuan/" + hasil.id + "?dikirim=1");
}
