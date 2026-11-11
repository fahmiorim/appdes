import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateApiKey(): { key: string; hashedKey: string; prefix: string } {
  const random = randomBytes(24).toString("hex");
  const prefix = "SID_";
  const key = `${prefix}${random}`;
  const hashedKey = hash(key).toString("hex");
  return { key, hashedKey, prefix };
}

export function hash(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyApiKey(key: string, hashedKey: string): boolean {
  const hashOfProvidedKey = hash(key);
  const hashFromDb = Buffer.from(hashedKey, "hex");

  if (hashOfProvidedKey.length !== hashFromDb.length) return false;
  return timingSafeEqual(hashOfProvidedKey, hashFromDb);
}
