import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { AUDIT_EVENTS, type AuditEventInput } from "@/features/audit/domain/audit";
import { appendAuditLog } from "@/features/audit/infrastructure/audit-repository";
import { APP_NAME } from "@/lib/app-config";
import { alamatIp } from "@/lib/client-ip";
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

  database: drizzleAdapter(db, { provider: "mysql", usePlural: true }),

  emailAndPassword: {
    enabled: true,
    // PIN warga hanya 6 digit; kebijakan staf minimal 8 tetap ditegakkan di
    // skema form/use case pengguna. better-auth hanya menetapkan batas bawah
    // teknis agar kedua jenis akun dapat memakai mekanisme kredensial yang sama.
    minPasswordLength: 6,
    maxPasswordLength: 72,
    requireEmailVerification: false,
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

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
    updateAge: 60 * 60 * 24, // perpanjang bila sesi dipakai setelah 1 hari
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // cache cookie 5 menit untuk mengurangi query DB
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
    },
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 100,
      usernameValidator: (value) => /^[a-zA-Z0-9._-]+$/.test(value),
    }),
    // WAJIB paling akhir.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
