"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createKeluarga, deleteKeluarga, getKeluargaDetail, updateKeluarga } from "@/features/keluarga/application/use-cases";
import { HEAD_OF_FAMILY_RELATION_ID } from "@/features/keluarga/domain/keluarga";
import { keluargaFormSchema } from "@/features/keluarga/domain/keluarga";
import { getPendudukFormData, updatePenduduk } from "@/features/penduduk/application/use-cases";

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

export async function lepasAnggotaKeluargaAction(formData: FormData): Promise<never> {
  const id = Number(formData.get("id"));
  const familyId = Number(formData.get("familyId"));
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(familyId) || familyId <= 0) throw new Error("Data anggota keluarga tidak valid.");
  const [{ penduduk }, family] = await Promise.all([getPendudukFormData(id), getKeluargaDetail(familyId)]);
  if (!penduduk || penduduk.familyId !== familyId || !family.members.some((member) => member.id === id)) throw new Error("Anggota tidak ditemukan pada Kartu Keluarga ini.");
  if (penduduk.familyRelationId === HEAD_OF_FAMILY_RELATION_ID && family.members.length > 1) throw new Error("Tetapkan anggota lain sebagai kepala keluarga sebelum melepas kepala keluarga saat ini.");
  const { id: _id, ...input } = penduduk;
  await updatePenduduk(id, { ...input, familyId: null, familyRelationId: null });
  revalidatePath(`/keluarga/${familyId}`); revalidatePath("/keluarga"); revalidatePath("/penduduk");
  redirect(`/keluarga/${familyId}?memberRemoved=1`);
}
