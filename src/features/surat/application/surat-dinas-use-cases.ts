import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import {
  SURAT_DINAS_RESOURCE,
  suratDinasFormSchema,
} from "@/features/surat/domain/surat";
import { getKlasifikasi, listKlasifikasi } from "@/features/surat/infrastructure/master-repository";
import {
  deleteSuratDinas,
  getSuratDinas,
  listSuratDinas,
  saveSuratDinas,
} from "@/features/surat/infrastructure/surat-dinas-repository";
import { notFound, validationError } from "@/lib/errors";
import { requirePermission } from "@/lib/dal";

export async function getSuratDinasData(search = "") {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [rows] = await Promise.all([listSuratDinas(villageId, search)]);
  return {
    rows,
    canCreate: hasPermission(user.permissions, SURAT_DINAS_RESOURCE, "create"),
    canUpdate: hasPermission(user.permissions, SURAT_DINAS_RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, SURAT_DINAS_RESOURCE, "delete"),
  };
}

export async function getSuratDinasEditorData(id?: number) {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const [row, klasifikasi] = await Promise.all([
    id ? getSuratDinas(villageId, id) : null,
    listKlasifikasi(villageId),
  ]);
  if (id && !row) throw notFound("Surat dinas tidak ditemukan.");
  return { row, klasifikasi };
}

export async function simpanSuratDinasData(id: number | null, raw: unknown) {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const parsed = suratDinasFormSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Data surat dinas tidak valid.");
  const input = parsed.data;
  if (input.classificationId !== null && !(await getKlasifikasi(villageId, input.classificationId))) {
    throw validationError("Klasifikasi tidak ditemukan pada desa aktif.");
  }
  if (id !== null && !(await getSuratDinas(villageId, id))) {
    throw notFound("Surat dinas tidak ditemukan.");
  }
  const savedId = await saveSuratDinas(villageId, id, input);
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: id ? AUDIT_EVENTS.suratDinasUpdate : AUDIT_EVENTS.suratDinasCreate,
    resource: SURAT_DINAS_RESOURCE,
    resourceId: String(savedId),
  });
  return savedId;
}

export async function hapusSuratDinasData(id: number) {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  if (!(await getSuratDinas(villageId, id))) throw notFound("Surat dinas tidak ditemukan.");
  await deleteSuratDinas(villageId, id);
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.suratDinasDelete,
    resource: SURAT_DINAS_RESOURCE,
    resourceId: String(id),
  });
}
