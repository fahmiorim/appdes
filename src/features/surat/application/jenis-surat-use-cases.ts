import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";

import { requirePermission } from "@/lib/dal";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { JENIS_SURAT_RESOURCE, KLASIFIKASI_SURAT_RESOURCE, SYARAT_SURAT_RESOURCE, klasifikasiSuratFormSchema, syaratSuratFormSchema, jenisSuratFormSchema } from "@/features/surat/domain/surat";
import { parseIsianFields, parseSyaratIds, validateIsianFields } from "@/features/surat/domain/isian";
import { listKlasifikasi, listJenisSurat, listSyaratSurat, getJenisSurat, jenisSuratExists, createJenisSurat, updateJenisSurat, deleteJenisSurat, countSuratByJenis, klasifikasiExists, getKlasifikasi, createKlasifikasi, updateKlasifikasi, deleteKlasifikasi, countJenisByKlasifikasi, getSyaratSurat, syaratSuratNameExists, createSyaratSurat, updateSyaratSurat, deleteSyaratSurat, countJenisBySyarat } from "@/features/surat/infrastructure/master-repository";
import { notFound, conflict, validationError } from "@/lib/errors";

export async function getMasterJenisSuratData() {
  const user = await requirePermission(JENIS_SURAT_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [jenis, klasifikasi, syarat] = await Promise.all([
    listJenisSurat(villageId), listKlasifikasi(villageId), listSyaratSurat(villageId),
  ]);
  return { jenis, klasifikasi, syarat };
}

export async function getJenisSuratEditorData(id?: number) {
  const user = await requirePermission(JENIS_SURAT_RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const [klasifikasi, syarat, jenis] = await Promise.all([
    listKlasifikasi(villageId), listSyaratSurat(villageId),
    id ? getJenisSurat(villageId, id) : Promise.resolve(null),
  ]);
  if (id && !jenis) throw notFound("Jenis surat tidak ditemukan.");
  return { klasifikasi, syarat, jenis };
}

export async function simpanJenisSuratData(id: number | null, raw: unknown): Promise<number> {
  const user = await requirePermission(JENIS_SURAT_RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const parsed = jenisSuratFormSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Data jenis surat tidak valid.");
  const input = parsed.data;
  let rawFields: unknown;
  try { rawFields = JSON.parse(input.formIsian); } catch { throw validationError("Format isian dinamis harus berupa JSON yang valid."); }
  if (!Array.isArray(rawFields)) throw validationError("Daftar isian dinamis harus berupa array.");
  const fields = parseIsianFields(input.formIsian);
  if (fields.length !== rawFields.length) throw validationError("Ada definisi isian dinamis yang tidak valid.");
  const fieldError = validateIsianFields(fields);
  if (fieldError) throw validationError(fieldError);
  const syaratIds = parseSyaratIds(input.syaratSurat);
  const available = await listSyaratSurat(villageId);
  if (syaratIds.some((syaratId) => !available.some((item) => item.id === syaratId))) {
    throw validationError("Ada persyaratan yang tidak termasuk dalam desa aktif.");
  }
  if (await jenisSuratExists(villageId, input.code, id)) throw conflict("Kode jenis surat sudah digunakan.");
  if (id) {
    const existing = await getJenisSurat(villageId, id);
    if (!existing) throw notFound("Jenis surat tidak ditemukan.");
    await updateJenisSurat(villageId, id, input);
    await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.jenisSuratUpdate, resource: JENIS_SURAT_RESOURCE, resourceId: String(id), details: { code: input.code } });
    return id;
  }
  const createdId = await createJenisSurat(villageId, input);
  await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.jenisSuratCreate, resource: JENIS_SURAT_RESOURCE, resourceId: String(createdId), details: { code: input.code } });
  return createdId;
}

export async function hapusJenisSuratData(id: number): Promise<void> {
  const user = await requirePermission(JENIS_SURAT_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const existing = await getJenisSurat(villageId, id);
  if (!existing) throw notFound("Jenis surat tidak ditemukan.");
  const used = await countSuratByJenis(villageId, id);
  if (used > 0) throw conflict("Jenis surat sudah pernah dipakai. Nonaktifkan saja agar riwayat surat tetap aman.");
  await deleteJenisSurat(villageId, id);
  await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.jenisSuratDelete, resource: JENIS_SURAT_RESOURCE, resourceId: String(id), details: { code: existing.code } });
}

export async function simpanKlasifikasiSuratData(id: number | null, raw: unknown): Promise<number> {
  const user = await requirePermission(KLASIFIKASI_SURAT_RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const parsed = klasifikasiSuratFormSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Data klasifikasi tidak valid.");
  if (await klasifikasiExists(villageId, parsed.data.code, id)) throw conflict("Kode klasifikasi sudah digunakan.");
  if (id !== null) {
    const existing = await getKlasifikasi(villageId, id);
    if (!existing) throw notFound("Klasifikasi tidak ditemukan.");
    await updateKlasifikasi(villageId, id, parsed.data);
    await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.klasifikasiUpdate, resource: KLASIFIKASI_SURAT_RESOURCE, resourceId: String(id), details: { code: parsed.data.code } });
    return id;
  }
  const createdId = await createKlasifikasi(villageId, parsed.data);
  await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.klasifikasiCreate, resource: KLASIFIKASI_SURAT_RESOURCE, resourceId: String(createdId), details: { code: parsed.data.code } });
  return createdId;
}

export async function hapusKlasifikasiSuratData(id: number): Promise<void> {
  const user = await requirePermission(KLASIFIKASI_SURAT_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const existing = await getKlasifikasi(villageId, id);
  if (!existing) throw notFound("Klasifikasi tidak ditemukan.");
  if (await countJenisByKlasifikasi(villageId, id) > 0) throw conflict("Klasifikasi masih digunakan jenis surat. Pindahkan klasifikasinya terlebih dahulu.");
  await deleteKlasifikasi(villageId, id);
  await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.klasifikasiDelete, resource: KLASIFIKASI_SURAT_RESOURCE, resourceId: String(id), details: { code: existing.code } });
}

export async function simpanSyaratSuratData(id: number | null, raw: unknown): Promise<number> {
  const user = await requirePermission(SYARAT_SURAT_RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const parsed = syaratSuratFormSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Data persyaratan tidak valid.");
  const input = { ...parsed.data, description: parsed.data.description || null };
  if (await syaratSuratNameExists(villageId, input.name, id)) throw conflict("Nama persyaratan sudah digunakan.");
  if (id !== null) {
    const existing = await getSyaratSurat(villageId, id);
    if (!existing) throw notFound("Persyaratan tidak ditemukan.");
    await updateSyaratSurat(villageId, id, input);
    await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.syaratUpdate, resource: SYARAT_SURAT_RESOURCE, resourceId: String(id), details: { name: input.name } });
    return id;
  }
  const createdId = await createSyaratSurat(villageId, input);
  await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.syaratCreate, resource: SYARAT_SURAT_RESOURCE, resourceId: String(createdId), details: { name: input.name } });
  return createdId;
}

export async function hapusSyaratSuratData(id: number): Promise<void> {
  const user = await requirePermission(SYARAT_SURAT_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const existing = await getSyaratSurat(villageId, id);
  if (!existing) throw notFound("Persyaratan tidak ditemukan.");
  if (await countJenisBySyarat(villageId, id) > 0) throw conflict("Persyaratan masih digunakan oleh jenis surat. Lepaskan dari jenis surat terlebih dahulu.");
  await deleteSyaratSurat(villageId, id);
  await recordAuditEvent({ villageId, actorId: user.id, event: AUDIT_EVENTS.syaratDelete, resource: SYARAT_SURAT_RESOURCE, resourceId: String(id), details: { name: existing.name } });
}

