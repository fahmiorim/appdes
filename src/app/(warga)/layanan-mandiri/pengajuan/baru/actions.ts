"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ajukanLayananWargaData } from "@/features/pelayanan/application/pengajuan-use-cases";

export async function ajukanLayananWargaAction(formData: FormData) {
  const file = formData.get("lampiran");
  let unggahan = null;
  if (file instanceof File && file.size > 0) {
    unggahan = { nama: file.name, mime: file.type || null, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) };
  }
  const hasil = await ajukanLayananWargaData({
    layananId: formData.get("layananId"),
    keperluan: String(formData.get("keperluan") ?? ""),
    telepon: String(formData.get("telepon") ?? ""),
    email: String(formData.get("email") ?? ""),
  }, unggahan);
  revalidatePath("/layanan-mandiri/beranda");
  redirect("/layanan-mandiri/pengajuan/" + hasil.id + "?dikirim=1");
}
