import "server-only";
import { and, asc, eq, isNull, or, gt } from "drizzle-orm";
import { db } from "@/db";
import { villageBlockedIps, villageSecuritySettings } from "@/db/schema";
import type { BlockedIpDTO, KeamananInput } from "../domain/keamanan";

export const DEFAULT_SECURITY_SETTINGS: KeamananInput = {
  passwordMinLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true,
  requireSymbol: false, sessionTimeoutMinutes: 30, autoLogoutInactive: true,
  warnBeforeSessionEnd: true, concurrentLogin: false, ipRestrictionEnabled: false, allowedIps: [],
};

function parseIps(raw: string | null): string[] {
  if (!raw) return [];
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) && value.every((x) => typeof x === "string") ? value : []; }
  catch { return []; }
}

export async function getSecuritySettings(villageId: number): Promise<KeamananInput> {
  const [row] = await db.select().from(villageSecuritySettings).where(eq(villageSecuritySettings.villageId, villageId)).limit(1);
  if (!row) return DEFAULT_SECURITY_SETTINGS;
  return { ...DEFAULT_SECURITY_SETTINGS, ...row, allowedIps: parseIps(row.allowedIps) };
}

export async function saveSecuritySettings(villageId: number, actorId: string, input: KeamananInput): Promise<void> {
  await db.insert(villageSecuritySettings).values({
    villageId, updatedBy: actorId, passwordMinLength: input.passwordMinLength,
    requireUppercase: input.requireUppercase, requireLowercase: input.requireLowercase,
    requireNumber: input.requireNumber, requireSymbol: input.requireSymbol,
    sessionTimeoutMinutes: input.sessionTimeoutMinutes, autoLogoutInactive: input.autoLogoutInactive,
    warnBeforeSessionEnd: input.warnBeforeSessionEnd, concurrentLogin: input.concurrentLogin,
    ipRestrictionEnabled: input.ipRestrictionEnabled, allowedIps: JSON.stringify(input.allowedIps),
  }).onDuplicateKeyUpdate({ set: {
    updatedBy: actorId, passwordMinLength: input.passwordMinLength,
    requireUppercase: input.requireUppercase, requireLowercase: input.requireLowercase,
    requireNumber: input.requireNumber, requireSymbol: input.requireSymbol,
    sessionTimeoutMinutes: input.sessionTimeoutMinutes, autoLogoutInactive: input.autoLogoutInactive,
    warnBeforeSessionEnd: input.warnBeforeSessionEnd, concurrentLogin: input.concurrentLogin,
    ipRestrictionEnabled: input.ipRestrictionEnabled, allowedIps: JSON.stringify(input.allowedIps),
  }});
}

export async function listBlockedIps(villageId: number): Promise<BlockedIpDTO[]> {
  return db.select({ id: villageBlockedIps.id, ipAddress: villageBlockedIps.ipAddress, reason: villageBlockedIps.reason, expiresAt: villageBlockedIps.expiresAt, createdAt: villageBlockedIps.createdAt })
    .from(villageBlockedIps).where(eq(villageBlockedIps.villageId, villageId)).orderBy(asc(villageBlockedIps.ipAddress));
}
export async function createBlockedIp(villageId: number, createdBy: string, ipAddress: string, reason: string): Promise<void> {
  await db.insert(villageBlockedIps).values({ villageId, createdBy, ipAddress, reason }).onDuplicateKeyUpdate({ set: { reason, createdBy, createdAt: new Date() } });
}
export async function deleteBlockedIp(villageId: number, id: number): Promise<void> {
  await db.delete(villageBlockedIps).where(and(eq(villageBlockedIps.villageId, villageId), eq(villageBlockedIps.id, id)));
}
export async function getLoginIpPolicy(username: string): Promise<{ villageId: number; ipRestrictionEnabled: boolean; allowedIps: string[]; blocked: boolean } | null> {
  const { users } = await import("@/db/schema/auth");
  const [user] = await db.select({ villageId: users.villageId }).from(users).where(eq(users.username, username)).limit(1);
  if (!user?.villageId) return null;
  const [settings] = await db.select().from(villageSecuritySettings).where(eq(villageSecuritySettings.villageId, user.villageId)).limit(1);
  const [blocked] = await db.select({ id: villageBlockedIps.id }).from(villageBlockedIps).where(and(
    eq(villageBlockedIps.villageId, user.villageId),
    eq(villageBlockedIps.ipAddress, "__IP_PLACEHOLDER__"),
    or(isNull(villageBlockedIps.expiresAt), gt(villageBlockedIps.expiresAt, new Date())),
  )).limit(1);
  return { villageId: user.villageId, ipRestrictionEnabled: settings?.ipRestrictionEnabled ?? false, allowedIps: parseIps(settings?.allowedIps ?? null), blocked: Boolean(blocked) };
}
export async function isTenantIpBlocked(villageId: number, ipAddress: string): Promise<boolean> {
  const [row] = await db.select({ id: villageBlockedIps.id }).from(villageBlockedIps).where(and(
    eq(villageBlockedIps.villageId, villageId), eq(villageBlockedIps.ipAddress, ipAddress),
    or(isNull(villageBlockedIps.expiresAt), gt(villageBlockedIps.expiresAt, new Date())),
  )).limit(1);
  return Boolean(row);
}
