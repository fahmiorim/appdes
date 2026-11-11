import { eq } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";

import { hash, verifyApiKey } from "./api-key";

type ApiKeyRecord = typeof apiKeys.$inferSelect;

export type AuthResult =
  { ok: false; status: number; message: string } | { ok: true; apiKey: ApiKeyRecord };

export async function authenticateApiKey(key: string): Promise<AuthResult> {
  if (!key.startsWith("SID_")) return { ok: false, status: 401, message: "Kunci API tidak valid." };

  const apiKeyRecord = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.hashedKey, hash(key).toString("hex")),
  });

  if (!apiKeyRecord) return { ok: false, status: 401, message: "Kunci API tidak valid." };
  if (!apiKeyRecord.active) return { ok: false, status: 403, message: "Kunci API tidak aktif." };

  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 401, message: "Kunci API sudah kedaluwarsa." };
  }

  if (!verifyApiKey(key, apiKeyRecord.hashedKey)) {
    return { ok: false, status: 401, message: "Kunci API tidak valid." };
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyRecord.id))
    .catch((error) => console.error("Gagal memperbarui lastUsedAt API key:", error));

  return { ok: true, apiKey: apiKeyRecord };
}
