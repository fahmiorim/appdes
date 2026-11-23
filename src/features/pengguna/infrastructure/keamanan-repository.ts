import "server-only";

import { and, asc, count, desc, eq, gt, gte, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  accounts,
  auditLogs,
  passwordHistory,
  sessions,
  users,
  villageBlockedIps,
  villageSecuritySettings,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { conflict } from "@/lib/errors";

import {
  DEFAULT_SECURITY_SETTINGS,
  type BlockedIpDTO,
  type KeamananInput,
} from "../domain/keamanan";

export { DEFAULT_SECURITY_SETTINGS };

function parseIps(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every((x) => typeof x === "string") ? value : [];
  } catch {
    return [];
  }
}

export async function getUserSecurityProfile(userId: string) {
  const [row] = await db
    .select({
      twoFactorEnabled: users.twoFactorEnabled,
      email: users.email,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export async function getSecuritySettings(villageId: number): Promise<KeamananInput> {
  const [row] = await db
    .select()
    .from(villageSecuritySettings)
    .where(eq(villageSecuritySettings.villageId, villageId))
    .limit(1);
  if (!row) return DEFAULT_SECURITY_SETTINGS;
  return { ...DEFAULT_SECURITY_SETTINGS, ...row, allowedIps: parseIps(row.allowedIps) };
}

export async function saveSecuritySettings(
  villageId: number,
  actorId: string,
  input: KeamananInput,
): Promise<void> {
  await db
    .insert(villageSecuritySettings)
    .values({
      villageId,
      updatedBy: actorId,
      passwordMinLength: input.passwordMinLength,
      passwordExpiryDays: input.passwordExpiryDays,
      passwordReuseCount: input.passwordReuseCount,
      requireUppercase: input.requireUppercase,
      requireLowercase: input.requireLowercase,
      requireNumber: input.requireNumber,
      requireSymbol: input.requireSymbol,
      sessionTimeoutMinutes: input.sessionTimeoutMinutes,
      autoLogoutInactive: input.autoLogoutInactive,
      concurrentLogin: input.concurrentLogin,
      requireTwoFactorForAllUsers: input.requireTwoFactorForAllUsers,
      ipRestrictionEnabled: input.ipRestrictionEnabled,
      allowedIps: JSON.stringify(input.allowedIps),
    })
    .onDuplicateKeyUpdate({
      set: {
        updatedBy: actorId,
        passwordMinLength: input.passwordMinLength,
        passwordExpiryDays: input.passwordExpiryDays,
        passwordReuseCount: input.passwordReuseCount,
        requireUppercase: input.requireUppercase,
        requireLowercase: input.requireLowercase,
        requireNumber: input.requireNumber,
        requireSymbol: input.requireSymbol,
        sessionTimeoutMinutes: input.sessionTimeoutMinutes,
        autoLogoutInactive: input.autoLogoutInactive,
        concurrentLogin: input.concurrentLogin,
        requireTwoFactorForAllUsers: input.requireTwoFactorForAllUsers,
        ipRestrictionEnabled: input.ipRestrictionEnabled,
        allowedIps: JSON.stringify(input.allowedIps),
      },
    });
}

export interface RingkasanKeamanan {
  staffCount: number;
  twoFactorCount: number;
  activeSessions: number;
  failedLogins: number;
}

/**
 * Angka ringkas untuk halaman Pengaturan Keamanan. Perhitungan waktu dilakukan
 * di sini agar komponen halaman tidak memanggil fungsi impure saat render.
 */
export async function getSecurityOverview(villageId: number): Promise<RingkasanKeamanan> {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const stafAktif = and(
    eq(users.villageId, villageId),
    isNull(users.residentId),
    eq(users.active, true),
  );
  const [staff, twoFactor, activeSessions, failed] = await Promise.all([
    db.select({ total: count() }).from(users).where(stafAktif),
    db
      .select({ total: count() })
      .from(users)
      .where(and(stafAktif, eq(users.twoFactorEnabled, true))),
    db
      .select({ total: count() })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(users.villageId, villageId), gt(sessions.expiresAt, now))),
    db
      .select({ total: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.villageId, villageId),
          eq(auditLogs.event, "auth.login.failure"),
          gte(auditLogs.createdAt, since),
        ),
      ),
  ]);
  return {
    staffCount: Number(staff[0]?.total ?? 0),
    twoFactorCount: Number(twoFactor[0]?.total ?? 0),
    activeSessions: Number(activeSessions[0]?.total ?? 0),
    failedLogins: Number(failed[0]?.total ?? 0),
  };
}

export async function listBlockedIps(villageId: number): Promise<BlockedIpDTO[]> {
  return db
    .select({
      id: villageBlockedIps.id,
      ipAddress: villageBlockedIps.ipAddress,
      reason: villageBlockedIps.reason,
      expiresAt: villageBlockedIps.expiresAt,
      createdAt: villageBlockedIps.createdAt,
    })
    .from(villageBlockedIps)
    .where(eq(villageBlockedIps.villageId, villageId))
    .orderBy(asc(villageBlockedIps.ipAddress));
}
export async function createBlockedIp(
  villageId: number,
  createdBy: string,
  ipAddress: string,
  reason: string,
): Promise<void> {
  await db
    .insert(villageBlockedIps)
    .values({ villageId, createdBy, ipAddress, reason })
    .onDuplicateKeyUpdate({ set: { reason, createdBy, createdAt: new Date() } });
}
export async function deleteBlockedIp(villageId: number, id: number): Promise<void> {
  await db
    .delete(villageBlockedIps)
    .where(and(eq(villageBlockedIps.villageId, villageId), eq(villageBlockedIps.id, id)));
}
export async function isTenantIpBlocked(villageId: number, ipAddress: string): Promise<boolean> {
  const [row] = await db
    .select({ id: villageBlockedIps.id })
    .from(villageBlockedIps)
    .where(
      and(
        eq(villageBlockedIps.villageId, villageId),
        eq(villageBlockedIps.ipAddress, ipAddress),
        or(isNull(villageBlockedIps.expiresAt), gt(villageBlockedIps.expiresAt, new Date())),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function assertPasswordNotReused(
  userId: string,
  password: string,
  reuseCount: number,
): Promise<void> {
  if (reuseCount <= 0) return;
  const [context, [credential], history] = await Promise.all([
    auth.$context,
    db
      .select({ password: accounts.password })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
      .limit(1),
    db
      .select({ passwordHash: passwordHistory.passwordHash })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(Math.max(0, reuseCount - 1)),
  ]);
  const hashes = [
    ...new Set(
      [credential?.password, ...history.map((item) => item.passwordHash)].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
  for (const hash of hashes) {
    if (await context.password.verify({ password, hash })) {
      throw conflict(`Password tidak boleh sama dengan ${reuseCount} password terakhir.`);
    }
  }
}
