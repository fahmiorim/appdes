import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";

import { LAYANAN_RESOURCE, layananSchema } from "../domain/layanan";
import {
  countLayanan,
  getLayanan,
  listLayanan,
  removeLayanan,
  saveLayanan,
} from "../infrastructure/layanan-repository";

export async function getLayananPageData(q = "") {
  const user = await requirePermission(LAYANAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [rows, total] = await Promise.all([listLayanan(villageId, q), countLayanan(villageId)]);
  return {
    rows,
    total,
    canCreate: hasPermission(user.permissions, LAYANAN_RESOURCE, "update"),
    canUpdate: hasPermission(user.permissions, LAYANAN_RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, LAYANAN_RESOURCE, "delete"),
  };
}
export async function getLayananDetailData(id: number) {
  const user = await requirePermission(LAYANAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const row = await getLayanan(villageId, id);
  if (!row) throw notFound("Layanan tidak ditemukan.");
  return row;
}
export async function getLayananEditorData(id?: number) {
  const user = await requirePermission(LAYANAN_RESOURCE, id === undefined ? "create" : "update");
  const villageId = await resolveVillageId(user);
  const row = id ? await getLayanan(villageId, id) : null;
  if (id && !row) throw notFound("Layanan tidak ditemukan.");
  return row;
}
export async function simpanLayananData(id: number | null, raw: unknown) {
  const user = await requirePermission(LAYANAN_RESOURCE, id === null ? "create" : "update");
  const villageId = await resolveVillageId(user);
  const parsed = layananSchema.safeParse(raw);
  if (!parsed.success)
    throw validationError(parsed.error.issues[0]?.message ?? "Data layanan tidak valid.");
  if (id !== null && !(await getLayanan(villageId, id))) throw notFound("Layanan tidak ditemukan.");
  return saveLayanan(villageId, id, parsed.data);
}
export async function hapusLayananData(id: number) {
  const user = await requirePermission(LAYANAN_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  if (!(await removeLayanan(villageId, id))) throw notFound("Layanan tidak ditemukan.");
}
