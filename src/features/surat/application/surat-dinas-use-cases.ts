import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { bacaMedia, hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { hasPermission } from "@/features/rbac/application/authorization";
import { SURAT_DINAS_RESOURCE, suratDinasFormSchema } from "@/features/surat/domain/surat";
import { getKlasifikasi, listKlasifikasi } from "@/features/surat/infrastructure/master-repository";
import {
  deleteSuratDinas,
  getSuratDinas,
  listSuratDinas,
  saveSuratDinas,
} from "@/features/surat/infrastructure/surat-dinas-repository";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";

const KATEGORI_LAMPIRAN = "surat";
const MAKS_PDF = 20 * 1024 * 1024;

export async function getSuratDinasData(search = "") {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const rows = await listSuratDinas(villageId, search);
  return {
    rows,
    canCreate: hasPermission(user.permissions, SURAT_DINAS_RESOURCE, "update"),
    canUpdate: hasPermission(user.permissions, SURAT_DINAS_RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, SURAT_DINAS_RESOURCE, "delete"),
  };
}

export async function getSuratDinasEditorData(id?: number) {
  const user = await requirePermission(
    SURAT_DINAS_RESOURCE,
    id === undefined ? "create" : "update",
  );
  const villageId = await resolveVillageId(user);
  const [row, klasifikasi] = await Promise.all([
    id ? getSuratDinas(villageId, id) : null,
    listKlasifikasi(villageId),
  ]);
  if (id && !row) throw notFound("Surat dinas tidak ditemukan.");
  return { row, klasifikasi };
}

export async function simpanSuratDinasData(
  id: number | null,
  raw: unknown,
  unggahan?: BerkasUnggahan | null,
) {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, id === null ? "create" : "update");
  const villageId = await resolveVillageId(user);
  const parsed = suratDinasFormSchema.safeParse(raw);
  if (!parsed.success)
    throw validationError(parsed.error.issues[0]?.message ?? "Data surat dinas tidak valid.");
  const input = parsed.data;
  if (
    input.classificationId !== null &&
    !(await getKlasifikasi(villageId, input.classificationId))
  ) {
    throw validationError("Klasifikasi tidak ditemukan pada desa aktif.");
  }
  const existing = id === null ? null : await getSuratDinas(villageId, id);
  if (id !== null && !existing) throw notFound("Surat dinas tidak ditemukan.");

  if (unggahan && input.hapusArsip) {
    throw validationError("Pilih unggah lampiran baru atau hapus lampiran lama, bukan keduanya.");
  }
  if (unggahan) {
    if (unggahan.mime?.toLowerCase() !== "application/pdf") {
      throw validationError("Lampiran surat dinas hanya menerima PDF.");
    }
    if (unggahan.ukuran > MAKS_PDF) {
      throw validationError("Ukuran PDF maksimal 20 MB.");
    }
  }

  let newPath: string | null = null;
  if (unggahan) {
    newPath = await simpanBerkasMedia(villageId, unggahan, KATEGORI_LAMPIRAN, "archiveFile");
  }

  const archiveFile = input.hapusArsip ? null : (newPath ?? existing?.archiveFile ?? null);
  let savedId: number;
  try {
    savedId = await saveSuratDinas(villageId, id, {
      ...input,
      archiveFile: archiveFile ?? "",
      hapusArsip: false,
    });
  } catch (error) {
    // Jangan tinggalkan file yatim bila penulisan metadata gagal.
    if (newPath) await hapusMedia(newPath);
    throw error;
  }

  // Hapus berkas lama hanya setelah DB menunjuk berkas baru/NULL. Batasi
  // penghapusan pada folder tenant kategori surat, jangan percaya jalur input.
  const oldPath = existing?.archiveFile ?? null;
  if (
    oldPath &&
    oldPath !== archiveFile &&
    oldPath.startsWith(`${villageId}/${KATEGORI_LAMPIRAN}/`)
  ) {
    await hapusMedia(oldPath);
  }

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: id ? AUDIT_EVENTS.suratDinasUpdate : AUDIT_EVENTS.suratDinasCreate,
    resource: SURAT_DINAS_RESOURCE,
    resourceId: String(savedId),
    details: { lampiran: archiveFile !== null },
  });
  return savedId;
}

export async function getSuratDinasLampiranData(id: number) {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const row = await getSuratDinas(villageId, id);
  if (!row?.archiveFile || !row.archiveFile.startsWith(`${villageId}/${KATEGORI_LAMPIRAN}/`)) {
    throw notFound("Lampiran surat dinas tidak ditemukan.");
  }
  const bytes = await bacaMedia(row.archiveFile);
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 0x2d
  )
    throw notFound("Berkas lampiran tidak valid.");
  return { bytes, fileName: `surat-dinas-${id}.pdf` };
}

export async function hapusSuratDinasData(id: number) {
  const user = await requirePermission(SURAT_DINAS_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const existing = await getSuratDinas(villageId, id);
  if (!existing) throw notFound("Surat dinas tidak ditemukan.");
  await deleteSuratDinas(villageId, id);
  if (existing.archiveFile?.startsWith(`${villageId}/${KATEGORI_LAMPIRAN}/`)) {
    await hapusMedia(existing.archiveFile);
  }
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.suratDinasDelete,
    resource: SURAT_DINAS_RESOURCE,
    resourceId: String(id),
  });
}
