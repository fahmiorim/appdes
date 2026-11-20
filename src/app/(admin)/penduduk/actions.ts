"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createPenduduk, deletePenduduk, updatePenduduk } from "@/features/penduduk/application/use-cases";
import { pendudukFormSchema } from "@/features/penduduk/domain/penduduk";
import { errorState, successState, toErrorState, type ActionState } from "@/lib/action-state";

const HALAMAN = "/penduduk";

function teks(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Ambil seluruh field formulir; validasi tipe dan aturan ada di skema Zod. */
function ambilFormulir(formData: FormData) {
  return {
    nationalId: teks(formData, "nationalId"),
    familyId: teks(formData, "familyId"),
    name: teks(formData, "name"),
    gender: teks(formData, "gender"),
    birthPlace: teks(formData, "birthPlace"),
    birthDate: teks(formData, "birthDate"),
    religionId: teks(formData, "religionId"),
    educationId: teks(formData, "educationId"),
    educationSedangId: teks(formData, "educationSedangId"),
    occupationId: teks(formData, "occupationId"),
    maritalStatusId: teks(formData, "maritalStatusId"),
    familyRelationId: teks(formData, "familyRelationId"),
    bloodTypeId: teks(formData, "bloodTypeId"),
    citizenshipId: teks(formData, "citizenshipId"),
    residenceStatus: teks(formData, "residenceStatus"),
    lifeStatus: teks(formData, "lifeStatus"),
    regionId: teks(formData, "regionId"),
    address: teks(formData, "address"),
    phone: teks(formData, "phone"),
    fatherName: teks(formData, "fatherName"),
    motherName: teks(formData, "motherName"),
    fatherNationalId: teks(formData, "fatherNationalId"),
    motherNationalId: teks(formData, "motherNationalId"),
  };
}

export async function buatPendudukAction(
  _state: ActionState<{ id: number }>,
  formData: FormData,
): Promise<ActionState<{ id: number }>> {
  try {
    const input = pendudukFormSchema.parse(ambilFormulir(formData));
    const hasil = await createPenduduk(input);

    revalidatePath(HALAMAN);
    revalidatePath("/penduduk/dashboard");
    revalidatePath("/keluarga");
    revalidatePath("/statistik/penduduk");
    revalidatePath(`${HALAMAN}/${hasil.id}`);

    return successState("Data penduduk berhasil ditambahkan.", hasil);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahPendudukAction(
  _state: ActionState<{ id: number }>,
  formData: FormData,
): Promise<ActionState<{ id: number }>> {
  const id = Number(teks(formData, "id"));
  if (!Number.isInteger(id) || id <= 0) {
    return errorState("Data penduduk tidak valid.");
  }

  try {
    const input = pendudukFormSchema.parse(ambilFormulir(formData));
    await updatePenduduk(id, input);

    revalidatePath(HALAMAN);
    revalidatePath("/penduduk/dashboard");
    revalidatePath("/keluarga");
    revalidatePath("/statistik/penduduk");
    revalidatePath(`${HALAMAN}/${id}`);

    return successState("Perubahan data penduduk disimpan.", { id });
  } catch (error) {
    return toErrorState(error);
  }
}

export async function hapusPendudukAction(formData: FormData): Promise<never> {
  const id = Number(teks(formData, "id"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Data penduduk tidak valid.");
  await deletePenduduk(id);
  revalidatePath(HALAMAN); revalidatePath("/penduduk/dashboard"); revalidatePath("/keluarga"); revalidatePath("/statistik/penduduk"); revalidatePath("/mutasi-penduduk");
  redirect("/penduduk?deleted=1");
}
