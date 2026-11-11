import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { validationError } from "@/lib/errors";

import {
  parsePengaturan,
  pengaturanSchema,
  serialisasiPengaturan,
  type Pengaturan,
} from "../domain/pengaturan";
import { listPengaturan, simpanPengaturan } from "../infrastructure/pengaturan-repository";

/**
 * Baca pengaturan efektif satu desa tanpa pemeriksaan izin.
 *
 * Dipakai jalur internal yang sudah menentukan desa dari host/sesi (mis.
 * gerbang pendaftaran warga dan komentar publik). Jangan diekspos langsung ke
 * klien.
 */
export async function bacaPengaturan(villageId: number): Promise<Pengaturan> {
  return parsePengaturan(await listPengaturan(villageId));
}

/** Pengaturan untuk halaman admin (butuh izin baca `pengaturan`). */
export async function ambilPengaturanAdmin(): Promise<Pengaturan> {
  const user = await requirePermission(RESOURCES.pengaturan, "read");
  const villageId = await resolveVillageId(user);
  return bacaPengaturan(villageId);
}

/** Simpan pengaturan dari form admin (validasi + izin ubah + scoping desa). */
export async function simpanPengaturanAdmin(input: unknown): Promise<Pengaturan> {
  const user = await requirePermission(RESOURCES.pengaturan, "update");
  const villageId = await resolveVillageId(user);

  const parsed = pengaturanSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Pengaturan tidak valid.");
  }

  await simpanPengaturan(villageId, serialisasiPengaturan(parsed.data));

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pengaturanUpdate,
    resource: RESOURCES.pengaturan,
    details: {
      komentarAktif: parsed.data.komentarAktif,
      beritaBeranda: parsed.data.beritaBeranda,
      pendaftaranWargaAktif: parsed.data.pendaftaranWargaAktif,
      penomoranSurat: parsed.data.penomoranSurat,
    },
  });

  return parsed.data;
}
