import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor, username } from "better-auth/plugins";
import { and, eq, ne, or, isNull, gt } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema/auth";
import { villageBlockedIps, villageSecuritySettings } from "@/db/schema/village-security";
import { AUDIT_EVENTS, type AuditEventInput } from "@/features/audit/domain/audit";
import { appendAuditLog } from "@/features/audit/infrastructure/audit-repository";
import { validasiKataSandi } from "@/features/pengguna/domain/keamanan";
import { APP_NAME } from "@/lib/app-config";
import { alamatIp, alamatIpDariHeader } from "@/lib/client-ip";
import { env } from "@/lib/env";

/** Audit reset sandi tidak boleh menggagalkan alur pemulihan akun. */
async function auditReset(input: AuditEventInput, request?: Request) {
  try {
    await appendAuditLog({
      ...input,
      ipAddress: request ? alamatIp(request) : null,
      userAgent: request?.headers.get("user-agent") ?? null,
    });
  } catch (error) {
    console.error("[auth] gagal mencatat audit reset sandi:", error);
  }
}

async function villageIdForUser(userId: string) {
  const [row] = await db
    .select({ villageId: users.villageId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.villageId ?? null;
}

/**
 * Instans better-auth (server-only).
 *
 * Keputusan desain:
 * - Tabel identitas memakai nama plural (`users`, `sessions`, `accounts`,
 *   `verifications`) dengan id string yang dikelola better-auth.
 * - Login memakai **username**; email bersifat opsional.
 * - Sesi berlaku 7 hari dan diperpanjang otomatis tiap 1 hari.
 * - `nextCookies()` harus berada di urutan terakhir plugin agar cookie sesi
 *   ikut ter-set ketika autentikasi dipanggil dari Server Action.
 *
 * Catatan: JANGAN impor modul ini dari komponen client. Untuk sisi client,
 * gunakan `@/lib/auth-client`.
 */
export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  // Login tenant hanya melalui username agar kebijakan tenant tidak dapat dilewati lewat email endpoint.
  disabledPaths: ["/sign-in/email"],

  // `transaction: true` membuat penyimpanan password baru, penandaan token reset,
  // dan pencabutan sesi berjalan atomik saat reset password.
  database: drizzleAdapter(db, { provider: "mysql", usePlural: true, transaction: true }),

  emailAndPassword: {
    enabled: true,
    // PIN warga hanya 6 digit; kebijakan staf minimal 8 tetap ditegakkan di
    // skema form/use case pengguna. better-auth hanya menetapkan batas bawah
    // teknis agar kedua jenis akun dapat memakai mekanisme kredensial yang sama.
    minPasswordLength: 6,
    maxPasswordLength: 72,
    requireEmailVerification: false,
    // Reset password wajib mencabut seluruh sesi perangkat lama.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }, request) => {
      await auditReset(
        {
          villageId: await villageIdForUser(user.id),
          actorId: user.id,
          event: AUDIT_EVENTS.passwordResetRequest,
          resource: "auth",
          resourceId: user.id,
        },
        request,
      );

      const resetUrl = `${env.BETTER_AUTH_URL}/reset-sandi?token=${token}`;
      const apiKey = env.RESEND_API_KEY;
      if (!apiKey || !env.RESEND_FROM) {
        // shortcut: tanpa Resend, tautan reset hanya tersedia di console dev.
        if (env.NODE_ENV === "development") {
          console.warn(`[auth] tautan reset sandi ${user.email}: ${resetUrl}`);
        } else {
          console.error(
            "[auth] Konfigurasi RESEND_API_KEY/RESEND_FROM tidak lengkap; email reset tidak dikirim.",
          );
        }
        return;
      }

      const { Resend } = await import("resend");
      const { error } = await new Resend(apiKey).emails.send({
        from: env.RESEND_FROM,
        to: user.email,
        subject: `[${APP_NAME}] Atur ulang sandi`,
        text: `Halo ${user.name},\n\nBuka tautan berikut untuk mengatur ulang sandi Anda:\n${resetUrl}\n\nAbaikan email ini bila Anda tidak memintanya.`,
      });
      if (error) console.error("[auth] gagal mengirim email reset:", error);
    },
    onPasswordReset: async ({ user }, request) => {
      await auditReset(
        {
          villageId: await villageIdForUser(user.id),
          actorId: user.id,
          event: AUDIT_EVENTS.passwordResetSuccess,
          resource: "auth",
          resourceId: user.id,
        },
        request,
      );
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/change-password") {
        const userId = ctx.context.session?.user?.id;
        const newPassword = typeof ctx.body?.newPassword === "string" ? ctx.body.newPassword : "";
        if (userId && newPassword) {
          const [account] = await db.select({ villageId: users.villageId }).from(users).where(eq(users.id, userId)).limit(1);
          if (account?.villageId) {
            const [policy] = await db.select().from(villageSecuritySettings).where(eq(villageSecuritySettings.villageId, account.villageId)).limit(1);
            if (policy) {
              const passwordError = validasiKataSandi(newPassword, policy);
              if (passwordError) throw new APIError("BAD_REQUEST", { message: passwordError });
            }
          }
        }
        return;
      }
      if (ctx.path !== "/sign-in/username") return;
      const username = typeof ctx.body?.username === "string" ? ctx.body.username.trim().toLowerCase() : "";
      if (!username) return;
      const [account] = await db.select({ villageId: users.villageId, residentId: users.residentId, twoFactorEnabled: users.twoFactorEnabled }).from(users).where(eq(users.username, username)).limit(1);
      if (!account?.villageId) return;
      const [tenantPolicy] = await db.select({ requireTwoFactor: villageSecuritySettings.requireTwoFactorForAllUsers }).from(villageSecuritySettings).where(eq(villageSecuritySettings.villageId, account.villageId)).limit(1);
      if (tenantPolicy?.requireTwoFactor && account.residentId === null && !account.twoFactorEnabled) throw new APIError("FORBIDDEN", { message: "Administrator mewajibkan autentikasi dua faktor. Hubungi administrator desa untuk aktivasi." });
      const ip = alamatIpDariHeader(ctx.headers, env.TRUST_PROXY);
      const [blocked] = await db.select({ id: villageBlockedIps.id }).from(villageBlockedIps).where(and(
        eq(villageBlockedIps.villageId, account.villageId), eq(villageBlockedIps.ipAddress, ip),
        or(isNull(villageBlockedIps.expiresAt), gt(villageBlockedIps.expiresAt, new Date())),
      )).limit(1);
      if (blocked) throw new APIError("FORBIDDEN", { message: "Alamat IP ini diblokir oleh administrator desa." });
      const [policy] = await db.select({ enabled: villageSecuritySettings.ipRestrictionEnabled, allowedIps: villageSecuritySettings.allowedIps })
        .from(villageSecuritySettings).where(eq(villageSecuritySettings.villageId, account.villageId)).limit(1);
      if (policy?.enabled) {
        let allowed: string[] = [];
        try { const parsed: unknown = policy.allowedIps ? JSON.parse(policy.allowedIps) : []; if (Array.isArray(parsed)) allowed = parsed.filter((v): v is string => typeof v === "string"); } catch {}
        if (ip === "tidak-diketahui" || !allowed.includes(ip)) throw new APIError("FORBIDDEN", { message: "Login hanya diizinkan dari alamat IP yang terdaftar." });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/username" && ctx.path !== "/two-factor/verify-totp") return;
      const current = ctx.context.newSession;
      if (!current) {
        const returned = ctx.context.returned as { twoFactorRedirect?: boolean } | undefined;
        if (returned?.twoFactorRedirect) return;
        const attemptedUsername = typeof ctx.body?.username === "string" ? ctx.body.username.trim().toLowerCase() : "";
        if (attemptedUsername) {
          const [failedAccount] = await db.select({ id: users.id, villageId: users.villageId }).from(users).where(eq(users.username, attemptedUsername)).limit(1);
          if (failedAccount?.villageId) {
            try { await appendAuditLog({ villageId: failedAccount.villageId, actorId: failedAccount.id, event: AUDIT_EVENTS.loginFailure, resource: "auth", resourceId: failedAccount.id, ipAddress: alamatIpDariHeader(ctx.headers, env.TRUST_PROXY), userAgent: ctx.headers.get("user-agent") }); } catch (error) { console.error("[auth] gagal mencatat login gagal:", error); }
          }
        }
        return;
      }
      const userId = current.user.id;
      const [account] = await db.select({ villageId: users.villageId }).from(users).where(eq(users.id, userId)).limit(1);
      if (!account?.villageId) return;
      const now = new Date();
      await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, userId));
      const [policy] = await db.select({ concurrentLogin: villageSecuritySettings.concurrentLogin }).from(villageSecuritySettings)
        .where(eq(villageSecuritySettings.villageId, account.villageId)).limit(1);
      if (policy?.concurrentLogin) await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, current.session.id)));
      try { await appendAuditLog({ villageId: account.villageId, actorId: userId, event: AUDIT_EVENTS.loginSuccess, resource: "auth", resourceId: userId, ipAddress: alamatIpDariHeader(ctx.headers, env.TRUST_PROXY), userAgent: ctx.headers.get("user-agent") }); } catch (error) { console.error("[auth] gagal mencatat login:", error); }
    }),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
    updateAge: 60 * 60 * 24, // perpanjang bila sesi dipakai setelah 1 hari
    // Sesi harus selalu diverifikasi ke database. Cookie cache stateless dapat
    // mempertahankan sesi yang sudah dicabut sampai cache kedaluwarsa.
    cookieCache: {
      enabled: false,
    },
  },

  /**
   * Batasi percobaan login. PIN warga hanya 6 digit, jadi perlindungan
   * brute-force sangat penting. Nilai bawaan tetap longgar untuk endpoint
   * lain; login username dibatasi 5 percobaan per menit per IP.
   */
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/username": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
    },
  },

  /**
   * Cookie sesi bersifat host-only: jangan bagikan ke subdomain. Pada mode
   * multi-domain, sesi desa A tidak boleh terbaca oleh desa B yang memakai
   * domain lain meskipun keduanya berbagi root domain.
   */
  advanced: {
    crossSubDomainCookies: { enabled: false },
  },

  user: {
    additionalFields: {
      // Nullable untuk mode satu-desa; diisi saat multi-desa aktif.
      villageId: { type: "number", required: false, input: false },
      // FK ke `roles.id` (RBAC).
      roleId: { type: "number", required: false, input: false },
      active: { type: "boolean", required: false, defaultValue: true, input: false },
      lastLoginAt: { type: "date", required: false, input: false },
      // FK ke `residents.id`; hanya diisi untuk akun warga.
      residentId: { type: "number", required: false, input: false },
      // Warga wajib mengganti PIN sementara sebelum memakai layanan.
      mustChangePin: { type: "boolean", required: false, defaultValue: true, input: false },
      twoFactorEnabled: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 100,
      usernameValidator: (value) => /^[a-zA-Z0-9._-]+$/.test(value),
    }),
    twoFactor({
      issuer: APP_NAME,
      twoFactorTable: "twoFactor",
      otpOptions: {
        async sendOTP({ user, otp }) {
          if (!user.email || !env.RESEND_API_KEY || !env.RESEND_FROM) throw new Error("Email OTP belum dikonfigurasi untuk akun ini.");
          const { Resend } = await import("resend");
          const { error } = await new Resend(env.RESEND_API_KEY).emails.send({
            from: env.RESEND_FROM, to: user.email, subject: `[${APP_NAME}] Kode verifikasi`,
            text: `Kode verifikasi Anda: ${otp}. Kode ini hanya berlaku singkat. Jangan bagikan kepada siapa pun.`,
          });
          if (error) throw new Error("Gagal mengirim kode verifikasi email.");
        },
      },
      accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 },
    }),
    // WAJIB paling akhir.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
