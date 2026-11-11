import "server-only";

import { z } from "zod";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";

import { generateApiKey } from "../domain/api-key";
import {
  buatKunciApiRecord,
  findKunciApi,
  listKunciApi,
  nonaktifkanKunciApi,
} from "../infrastructure/api-key-repository";

const buatKunciSchema = z.object({
  name: z.string().trim().min(1, "Nama kunci wajib diisi.").max(100, "Nama maksimal 100 karakter."),
  rateLimit: z.coerce
    .number()
    .int("Rate limit harus bilangan bulat.")
    .min(1)
    .max(10_000)
    .optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export interface KunciApiBaru {
  id: number;
  key: string;
  prefix: string;
  name: string;
  rateLimit: number;
  expiresAt: Date | null;
}

export async function buatKunciApi(input: unknown): Promise<KunciApiBaru> {
  const user = await requirePermission(RESOURCES.pengaturan, "update");
  const villageId = await resolveVillageId(user);
  const parsed = buatKunciSchema.parse(input);

  if (parsed.expiresAt && parsed.expiresAt.getTime() <= Date.now()) {
    throw validationError("Tanggal kedaluwarsa harus di masa depan.");
  }

  const { key, hashedKey, prefix } = generateApiKey();
  const rateLimit = parsed.rateLimit ?? 100;
  const expiresAt = parsed.expiresAt ?? null;

  const id = await buatKunciApiRecord({
    villageId,
    name: parsed.name,
    hashedKey,
    prefix,
    rateLimit,
    expiresAt,
  });

  return {
    id,
    key,
    prefix,
    name: parsed.name,
    rateLimit,
    expiresAt,
  };
}

/**
 * Cabut (nonaktifkan) satu kunci API milik desa pemanggil.
 *
 * Kunci tidak dihapus agar jejak audit dan `lastUsedAt` tetap terbaca; status
 * `active = false` langsung ditolak `authenticateApiKey`. Idempoten: memanggil
 * ulang pada kunci yang sudah nonaktif tidak menulis audit baru.
 */
export async function cabutKunciApi(
  id: number,
): Promise<{ id: number; name: string; active: false }> {
  const user = await requirePermission(RESOURCES.pengaturan, "update");
  const villageId = await resolveVillageId(user);

  if (!Number.isInteger(id) || id < 1) throw validationError("ID kunci tidak valid.");

  const kunci = await findKunciApi(villageId, id);

  if (!kunci) throw notFound("Kunci API tidak ditemukan.");

  if (kunci.active) {
    await nonaktifkanKunciApi(villageId, id);

    await recordAuditEvent({
      villageId,
      event: AUDIT_EVENTS.apiKeyRevoke,
      resource: "api-key",
      resourceId: String(kunci.id),
      details: { name: kunci.name },
    });
  }

  return { id: kunci.id, name: kunci.name, active: false };
}

export async function daftarKunciApi() {
  const user = await requirePermission(RESOURCES.pengaturan, "read");
  const villageId = await resolveVillageId(user);

  return listKunciApi(villageId);
}
