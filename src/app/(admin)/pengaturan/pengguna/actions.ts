"use server";

import { revalidatePath } from "next/cache";

import {
  createPenggunaData,
  deletePenggunaData,
  updatePenggunaData,
} from "@/features/pengguna/application/pengguna-use-cases";
import { penggunaCreateSchema, penggunaUpdateSchema } from "@/features/pengguna/domain/pengguna";
import { successState, toErrorState, type ActionState } from "@/lib/action-state";

const HALAMAN = "/pengaturan/pengguna";

function teks(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function buatPenggunaAction(
  _state: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  try {
    const input = penggunaCreateSchema.parse({
      name: teks(formData, "name"),
      username: teks(formData, "username"),
      email: teks(formData, "email"),
      roleId: teks(formData, "roleId"),
      active: formData.get("active") === "on",
      password: teks(formData, "password"),
    });

    const hasil = await createPenggunaData(input);
    revalidatePath(HALAMAN);
    return successState("Pengguna berhasil ditambahkan.", hasil);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahPenggunaAction(
  _state: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  try {
    const input = penggunaUpdateSchema.parse({
      name: teks(formData, "name"),
      username: teks(formData, "username"),
      email: teks(formData, "email"),
      roleId: teks(formData, "roleId"),
      active: formData.get("active") === "on",
      password: teks(formData, "password"),
    });

    await updatePenggunaData(teks(formData, "id"), input);
    revalidatePath(HALAMAN);
    return successState("Perubahan pengguna disimpan.", null);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function hapusPenggunaAction(
  _state: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  try {
    await deletePenggunaData(teks(formData, "id"));
    revalidatePath(HALAMAN);
    return successState("Pengguna dihapus.", null);
  } catch (error) {
    return toErrorState(error);
  }
}
