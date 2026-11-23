"use server";

import { isIP } from "node:net";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  hapusIpBlokir,
  simpanKebijakanKeamanan,
  tambahIpBlokir,
} from "@/features/pengguna/application/pengguna-use-cases";
import { DEFAULT_SECURITY_SETTINGS, keamananSchema } from "@/features/pengguna/domain/keamanan";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";

export async function simpanKeamananAction(formData: FormData): Promise<void> {
  const user = await requirePermission(RESOURCES.pengguna, "update");
  const villageId = await resolveVillageId(user);
  const rawIps = String(formData.get("allowedIps") ?? "")
    .split(/[\n,;]+/)
    .map((ip) => ip.trim())
    .filter(Boolean);
  const parsed = keamananSchema.safeParse({
    passwordMinLength: formData.get("passwordMinLength"),
    passwordExpiryDays: formData.get("passwordExpiryDays"),
    passwordReuseCount: formData.get("passwordReuseCount"),
    requireUppercase: formData.get("requireUppercase") === "on",
    requireLowercase: formData.get("requireLowercase") === "on",
    requireNumber: formData.get("requireNumber") === "on",
    requireSymbol: formData.get("requireSymbol") === "on",
    sessionTimeoutMinutes: formData.get("sessionTimeoutMinutes"),
    autoLogoutInactive: formData.get("autoLogoutInactive") === "on",
    concurrentLogin: formData.get("concurrentLogin") === "on",
    requireTwoFactorForAllUsers: formData.get("requireTwoFactorForAllUsers") === "on",
    ipRestrictionEnabled: formData.get("ipRestrictionEnabled") === "on",
    allowedIps: rawIps,
  });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Pengaturan keamanan tidak valid.");
  if (parsed.data.ipRestrictionEnabled && parsed.data.allowedIps.length === 0)
    throw new Error("Isi minimal satu IP yang diizinkan sebelum mengaktifkan pembatasan IP.");
  await simpanKebijakanKeamanan(villageId, user.id, parsed.data);
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pengaturanUpdate,
    resource: RESOURCES.pengguna,
    details: { securityPolicyUpdated: true },
  });
  revalidatePath("/pengaturan/pengguna");
  revalidatePath("/pengaturan/pengguna/keamanan");
}

export async function blokirIpAction(formData: FormData): Promise<void> {
  const user = await requirePermission(RESOURCES.pengguna, "create");
  const villageId = await resolveVillageId(user);
  const ip = String(formData.get("ipAddress") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (isIP(ip) === 0) throw new Error("Alamat IP tidak valid.");
  if (reason.length < 3 || reason.length > 255)
    throw new Error("Alasan blokir wajib 3–255 karakter.");
  await tambahIpBlokir(villageId, user.id, ip, reason);
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pengaturanUpdate,
    resource: RESOURCES.pengguna,
    details: { blockedIpAdded: true },
  });
  revalidatePath("/pengaturan/pengguna/keamanan");
}
export async function hapusBlokirIpAction(formData: FormData): Promise<void> {
  const user = await requirePermission(RESOURCES.pengguna, "delete");
  const villageId = await resolveVillageId(user);
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("ID blokir IP tidak valid.");
  await hapusIpBlokir(villageId, id);
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pengaturanUpdate,
    resource: RESOURCES.pengguna,
    details: { blockedIpRemoved: true },
  });
  revalidatePath("/pengaturan/pengguna/keamanan");
}

export async function resetKeamananAction(): Promise<void> {
  const user = await requirePermission(RESOURCES.pengguna, "update");
  const villageId = await resolveVillageId(user);
  await simpanKebijakanKeamanan(villageId, user.id, DEFAULT_SECURITY_SETTINGS);
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pengaturanUpdate,
    resource: RESOURCES.pengguna,
    details: { securityPolicyReset: true },
  });
  revalidatePath("/pengaturan/pengguna/keamanan");
}
