import "server-only";

import { requirePermission } from "@/lib/dal";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { JENIS_SURAT_RESOURCE, jenisSuratFormSchema } from "@/features/surat/domain/surat";
import { parseIsianFields, parseSyaratIds, validateIsianFields } from "@/features/surat/domain/isian";
import { listKlasifikasi, listJenisSurat, listSyaratSurat, getJenisSurat, jenisSuratExists, createJenisSurat, updateJenisSurat, deleteJenisSurat, countSuratByJenis } from "@/features/surat/infrastructure/master-repository";
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
    return id;
  }
  return createJenisSurat(villageId, input);
}

export async function hapusJenisSuratData(id: number): Promise<void> {
  const user = await requirePermission(JENIS_SURAT_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const existing = await getJenisSurat(villageId, id);
  if (!existing) throw notFound("Jenis surat tidak ditemukan.");
  const used = await countSuratByJenis(villageId, id);
  if (used > 0) throw conflict("Jenis surat sudah pernah dipakai. Nonaktifkan saja agar riwayat surat tetap aman.");
  await deleteJenisSurat(villageId, id);
}
