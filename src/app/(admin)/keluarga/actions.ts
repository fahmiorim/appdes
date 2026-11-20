"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createKeluarga, deleteKeluarga, updateKeluarga } from "@/features/keluarga/application/use-cases";
import { keluargaFormSchema } from "@/features/keluarga/domain/keluarga";

export async function buatKeluargaAction(formData: FormData): Promise<never> {
  const input = keluargaFormSchema.parse({
    number: String(formData.get("number") ?? ""),
    address: String(formData.get("address") ?? ""),
    regionId: String(formData.get("regionId") ?? ""),
  });
  const result = await createKeluarga(input);
  redirect(`/keluarga/${result.id}`);
}

export async function ubahKeluargaAction(id: number, formData: FormData): Promise<never> {
  const input = keluargaFormSchema.parse({
    number: String(formData.get("number") ?? ""),
    address: String(formData.get("address") ?? ""),
    regionId: String(formData.get("regionId") ?? ""),
  });
  await updateKeluarga(id, input);
  redirect(`/keluarga/${id}`);
}

export async function hapusKeluargaAction(formData: FormData): Promise<never> {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Kartu Keluarga tidak valid.");
  await deleteKeluarga(id);
  revalidatePath("/keluarga"); revalidatePath("/penduduk"); revalidatePath("/penduduk/dashboard");
  redirect("/keluarga?deleted=1");
}
