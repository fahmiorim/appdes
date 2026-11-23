"use server";

import { revalidatePath } from "next/cache";

import { duplicateRoleData } from "@/features/rbac/application/grup-use-cases";
import { roleFormSchema } from "@/features/rbac/domain/grup";
import { successState, toErrorState, type ActionState } from "@/lib/action-state";

export async function salinRoleAction(
  _state: ActionState<{ id: number }>,
  formData: FormData,
): Promise<ActionState<{ id: number }>> {
  try {
    const sourceRoleId = Number(formData.get("sourceRoleId"));
    if (!Number.isInteger(sourceRoleId) || sourceRoleId < 1)
      throw new Error("Role sumber tidak valid.");
    const input = roleFormSchema.parse({ name: String(formData.get("name") ?? "") });
    const result = await duplicateRoleData(sourceRoleId, input);
    revalidatePath("/pengaturan/grup-akses");
    revalidatePath("/pengaturan/pengguna");
    return successState("Role berhasil disalin beserta hak aksesnya.", result);
  } catch (error) {
    return toErrorState(error);
  }
}
