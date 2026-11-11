import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";

/** Query tabel `api_keys`; seluruh fungsi dibatasi `villageId` pemilik. */

export interface KunciApiRingkas {
  id: number;
  name: string;
  prefix: string;
  rateLimit: number;
  active: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export async function buatKunciApiRecord(input: {
  villageId: number;
  name: string;
  hashedKey: string;
  prefix: string;
  rateLimit: number;
  expiresAt: Date | null;
}): Promise<number> {
  const [hasil] = await db.insert(apiKeys).values(input).$returningId();
  if (!hasil) throw new Error("Gagal menyimpan kunci API.");
  return hasil.id;
}

export async function listKunciApi(villageId: number): Promise<KunciApiRingkas[]> {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      rateLimit: apiKeys.rateLimit,
      active: apiKeys.active,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.villageId, villageId))
    .orderBy(desc(apiKeys.id));
}

export async function findKunciApi(
  villageId: number,
  id: number,
): Promise<{ id: number; name: string; active: boolean } | null> {
  const [kunci] = await db
    .select({ id: apiKeys.id, name: apiKeys.name, active: apiKeys.active })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.villageId, villageId)))
    .limit(1);

  return kunci ?? null;
}

export async function nonaktifkanKunciApi(villageId: number, id: number): Promise<void> {
  await db
    .update(apiKeys)
    .set({ active: false })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.villageId, villageId)));
}
