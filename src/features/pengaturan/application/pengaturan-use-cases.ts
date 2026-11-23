import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { normalizePenomoranMode } from "@/features/surat/domain/penomoran";
import { requirePermission } from "@/lib/dal";
import { validationError } from "@/lib/errors";

import {
  parsePengaturan,
  pengaturanSchema,
  serialisasiPengaturan,
  type Pengaturan,
} from "../domain/pengaturan";
import {
  bacaPenomoranSurat,
  listPengaturan,
  simpanPengaturan,
  simpanPenomoranSurat,
} from "../infrastructure/pengaturan-repository";

/**
 * Baca pengaturan efektif satu desa tanpa pemeriksaan izin.
 *
 * Dipakai jalur internal yang sudah menentukan desa dari host/sesi (mis.
 * gerbang pendaftaran warga dan komentar publik). Jangan diekspos langsung ke
 * klien.
 */
export async function bacaPengaturan(villageId: number): Promise<Pengaturan> {
  const [rows, penomoranSurat] = await Promise.all([
    listPengaturan(villageId),
    bacaPenomoranSurat(villageId),
  ]);
  const parsed = parsePengaturan(rows);
  return {
    ...parsed,
    // Kolom tenant adalah sumber kebenaran yang dipakai mesin penomoran surat.
    penomoranSurat: normalizePenomoranMode(penomoranSurat),
  };
}

/** Pengaturan untuk halaman admin (butuh izin baca `pengaturan`). */
export async function ambilPengaturanAdmin(): Promise<Pengaturan> {
  const user = await requirePermission(RESOURCES.pengaturan, "read");
  const villageId = await resolveVillageId(user);
  return bacaPengaturan(villageId);
}

/**
 * Simpan pengaturan untuk tenant yang sudah diotorisasi pemanggil.
 * Pemanggil wajib memastikan villageId berasal dari sesi/host tepercaya.
 */
export async function simpanPengaturanTenant(
  villageId: number,
  input: unknown,
  actorId?: string,
): Promise<Pengaturan> {
  const parsed = pengaturanSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Pengaturan tidak valid.");
  }

  await simpanPengaturan(villageId, serialisasiPengaturan(parsed.data));
  await simpanPenomoranSurat(villageId, parsed.data.penomoranSurat);

  await recordAuditEvent({
    villageId,
    actorId,
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

/** Simpan pengaturan dari form admin (validasi + izin ubah + scoping desa). */
export async function simpanPengaturanAdmin(input: unknown): Promise<Pengaturan> {
  const user = await requirePermission(RESOURCES.pengaturan, "update");
  const villageId = await resolveVillageId(user);
  return simpanPengaturanTenant(villageId, input, user.id);
}
