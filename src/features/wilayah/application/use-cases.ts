import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { wilayahFormSchema, type WilayahFormInput } from "@/features/wilayah/domain/wilayah";
import {
  deleteWilayah,
  insertWilayah,
  updateWilayah,
  wilayahExists,
} from "@/features/wilayah/infrastructure/wilayah-repository";
import { requirePermission } from "@/lib/dal";

export async function simpanWilayah(id: number | null, input: WilayahFormInput) {
  const user = await requirePermission("wilayah", id === null ? "create" : "update");
  const villageId = await resolveVillageId(user);
  const parsed = wilayahFormSchema.parse(input);
  if (await wilayahExists(villageId, parsed, id))
    throw new Error("Kombinasi dusun/RW/RT sudah terdaftar.");
  if (id) await updateWilayah(villageId, id, parsed);
  else await insertWilayah(villageId, parsed);
}

export async function hapusWilayah(id: number) {
  const user = await requirePermission("wilayah", "delete");
  const villageId = await resolveVillageId(user);
  await deleteWilayah(villageId, id);
}
