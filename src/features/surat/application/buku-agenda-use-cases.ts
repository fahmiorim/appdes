import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  SURAT_MASUK_RESOURCE, SURAT_KELUAR_RESOURCE,
  suratMasukFormSchema, suratKeluarFormSchema,
} from "@/features/surat/domain/surat";
import { getKlasifikasi, listKlasifikasi } from "@/features/surat/infrastructure/master-repository";
import {
  deleteSuratMasuk, deleteSuratKeluar, getSuratMasuk, getSuratKeluar,
  listSuratMasuk, listSuratKeluar, saveSuratMasuk, saveSuratKeluar,
} from "@/features/surat/infrastructure/buku-agenda-repository";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";

export async function getBukuAgendaData(jenis: "masuk" | "keluar", search = "") {
  const resource = jenis === "masuk" ? SURAT_MASUK_RESOURCE : SURAT_KELUAR_RESOURCE;
  const user = await requirePermission(resource, "read");
  const villageId = await resolveVillageId(user);
  const [rows, klasifikasi] = await Promise.all([
    jenis === "masuk" ? listSuratMasuk(villageId, search) : listSuratKeluar(villageId, search),
    listKlasifikasi(villageId),
  ]);
  return { rows, klasifikasi };
}

export async function getBukuAgendaEditorData(jenis: "masuk" | "keluar", id?: number) {
  const resource = jenis === "masuk" ? SURAT_MASUK_RESOURCE : SURAT_KELUAR_RESOURCE;
  const user = await requirePermission(resource, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const [row, klasifikasi] = await Promise.all([
    id ? (jenis === "masuk" ? getSuratMasuk(villageId, id) : getSuratKeluar(villageId, id)) : null,
    listKlasifikasi(villageId),
  ]);
  if (id && !row) throw notFound("Data agenda surat tidak ditemukan.");
  return { row, klasifikasi };
}

export async function simpanBukuAgendaData(jenis: "masuk" | "keluar", id: number | null, raw: unknown) {
  const resource = jenis === "masuk" ? SURAT_MASUK_RESOURCE : SURAT_KELUAR_RESOURCE;
  const user = await requirePermission(resource, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const parsed = (jenis === "masuk" ? suratMasukFormSchema : suratKeluarFormSchema).safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Data agenda surat tidak valid.");
  const input = parsed.data;
  if (input.classificationId !== null && !(await getKlasifikasi(villageId, input.classificationId))) {
    throw validationError("Klasifikasi tidak ditemukan pada desa aktif.");
  }
  const existing = id === null ? null : (jenis === "masuk" ? await getSuratMasuk(villageId, id) : await getSuratKeluar(villageId, id));
  if (id !== null && !existing) throw notFound("Data agenda surat tidak ditemukan.");
  const savedId = jenis === "masuk"
    ? await saveSuratMasuk(villageId, id, input as import("@/features/surat/domain/surat").SuratMasukInput)
    : await saveSuratKeluar(villageId, id, input as import("@/features/surat/domain/surat").SuratKeluarInput);
  await recordAuditEvent({
    villageId, actorId: user.id,
    event: jenis === "masuk"
      ? (id ? AUDIT_EVENTS.suratMasukUpdate : AUDIT_EVENTS.suratMasukCreate)
      : (id ? AUDIT_EVENTS.suratKeluarUpdate : AUDIT_EVENTS.suratKeluarCreate),
    resource, resourceId: String(savedId),
  });
  return savedId;
}

export async function hapusBukuAgendaData(jenis: "masuk" | "keluar", id: number) {
  const resource = jenis === "masuk" ? SURAT_MASUK_RESOURCE : SURAT_KELUAR_RESOURCE;
  const user = await requirePermission(resource, "delete");
  const villageId = await resolveVillageId(user);
  const existing = jenis === "masuk" ? await getSuratMasuk(villageId, id) : await getSuratKeluar(villageId, id);
  if (!existing) throw notFound("Data agenda surat tidak ditemukan.");
  if (jenis === "masuk") await deleteSuratMasuk(villageId, id);
  else await deleteSuratKeluar(villageId, id);
  await recordAuditEvent({
    villageId, actorId: user.id,
    event: jenis === "masuk" ? AUDIT_EVENTS.suratMasukDelete : AUDIT_EVENTS.suratKeluarDelete,
    resource, resourceId: String(id),
  });
}
