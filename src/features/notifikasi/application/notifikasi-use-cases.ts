import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { validationError } from "@/lib/errors";

import { broadcastSchema, type FilterNotifikasi } from "../domain/notifikasi";
import {
  listNotifikasi,
  ringkasanNotifikasi,
  type BarisNotifikasi,
  type RingkasanNotifikasi,
} from "../infrastructure/notifikasi-repository";
import { kirimNotifikasi } from "./kirim-notifikasi";

export async function daftarNotifikasiAdmin(
  filter: FilterNotifikasi,
): Promise<{ baris: BarisNotifikasi[]; ringkasan: RingkasanNotifikasi }> {
  const user = await requirePermission(RESOURCES.notifikasi, "read");
  const villageId = await resolveVillageId(user);

  const [baris, ringkasan] = await Promise.all([
    listNotifikasi(villageId, filter),
    ringkasanNotifikasi(villageId),
  ]);

  return { baris, ringkasan };
}

/**
 * Kirim notifikasi manual dari pusat notifikasi.
 *
 * Pengiriman tetap dicatat sebagai bukti walaupun provider belum dikonfigurasi
 * (status "dilewati"), dan setiap percobaan diaudit.
 */
export async function kirimNotifikasiManual(input: unknown): Promise<{
  sukses: boolean;
  dilewati: boolean;
  error?: string;
}> {
  const user = await requirePermission(RESOURCES.notifikasi, "delete");
  const villageId = await resolveVillageId(user);

  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Data notifikasi tidak valid.");
  }

  const hasil = await kirimNotifikasi({
    villageId,
    jenis: "manual.broadcast",
    kanal: parsed.data.kanal,
    target: parsed.data.target,
    subjek: parsed.data.subjek || undefined,
    pesan: parsed.data.pesan,
  });

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.notifikasiKirim,
    resource: RESOURCES.notifikasi,
    details: {
      kanal: parsed.data.kanal,
      sukses: hasil.sukses,
      dilewati: hasil.dilewati,
    },
  });

  return hasil;
}
