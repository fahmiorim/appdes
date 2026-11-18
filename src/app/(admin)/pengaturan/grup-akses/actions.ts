"use server";

import { revalidatePath } from "next/cache";

import {
  createRoleData,
  deleteRoleData,
  saveRolePermissions,
  updateRoleData,
} from "@/features/rbac/application/grup-use-cases";
import { roleFormSchema } from "@/features/rbac/domain/grup";
import { successState, toErrorState, type ActionState } from "@/lib/action-state";

const HALAMAN = "/pengaturan/grup-akses";

function teks(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function roleIdDari(formData: FormData): number | null {
  const nilai = Number(teks(formData, "roleId"));
  return Number.isInteger(nilai) && nilai > 0 ? nilai : null;
}

export async function buatRoleAction(
  _state: ActionState<{ id: number }>,
  formData: FormData,
): Promise<ActionState<{ id: number }>> {
  try {
    const input = roleFormSchema.parse({ name: teks(formData, "name") });
    const hasil = await createRoleData(input);
    revalidatePath(HALAMAN);
    revalidatePath("/pengaturan/pengguna");
    return successState("Grup akses berhasil ditambahkan.", hasil);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahRoleAction(
  _state: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  try {
    const roleId = roleIdDari(formData);
    if (roleId === null) throw new Error("Grup akses tidak valid.");

    const input = roleFormSchema.parse({ name: teks(formData, "name") });
    await updateRoleData(roleId, input);
    revalidatePath(HALAMAN);
    revalidatePath("/pengaturan/pengguna");
    return successState("Nama grup akses diperbarui.", null);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function hapusRoleAction(
  _state: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  try {
    const roleId = roleIdDari(formData);
    if (roleId === null) throw new Error("Grup akses tidak valid.");

    await deleteRoleData(roleId);
    revalidatePath(HALAMAN);
    revalidatePath("/pengaturan/pengguna");
    return successState("Grup akses dihapus.", null);
  } catch (error) {
    return toErrorState(error);
  }
}

export async function simpanIzinAction(
  _state: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  try {
    const roleId = roleIdDari(formData);
    if (roleId === null) throw new Error("Grup akses tidak valid.");

    const izin = new Map<number, { read: boolean; write: boolean; manage: boolean }>();
    for (const nilai of formData.getAll("moduleId")) {
      const moduleId = Number(nilai);
      if (Number.isInteger(moduleId) && moduleId > 0) {
        izin.set(moduleId, { read: false, write: false, manage: false });
      }
    }

    for (const [kunci] of formData.entries()) {
      const cocok = /^(read|write|manage)-(\d+)$/.exec(kunci);
      if (!cocok) continue;
      const akses = cocok[1] as "read" | "write" | "manage";
      const moduleId = Number(cocok[2]);
      const baris = izin.get(moduleId);
      if (baris) baris[akses] = true;
    }

    await saveRolePermissions(
      roleId,
      [...izin.entries()].map(([moduleId, akses]) => ({ moduleId, ...akses })),
    );
    revalidatePath(HALAMAN);
    return successState("Izin grup akses disimpan.", null);
  } catch (error) {
    return toErrorState(error);
  }
}
