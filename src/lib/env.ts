import { z } from "zod";

/**
 * Skema variabel lingkungan (environment variables).
 *
 * Semua akses `process.env` di aplikasi WAJIB melewati modul ini supaya:
 * - nilai yang salah/absen ketahuan lebih awal (fail fast);
 * - tipe yang dipakai di kode sudah terjamin (`env.DATABASE_URL` bertipe string);
 * - tidak ada `process.env.X!` yang bertebaran.
 *
 * Catatan: modul ini TIDAK memakai `server-only` agar dapat dipakai juga oleh
 * skrip Node (drizzle-kit dan CLI). Jangan pernah mengimpornya dari komponen
 * client — variabel non-`NEXT_PUBLIC_*` hanya untuk server.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    /** URL publik aplikasi (untuk tautan absolut, callback OAuth, dsb.). */
    APP_URL: z.url().default("http://localhost:3000"),

    /**
     * Domain induk untuk wildcard subdomain desa (mis. `desa.id` sehingga
     * `<slug>.desa.id` menunjuk desa). Kosong = wildcard nonaktif.
     */
    DESA_BASE_DOMAIN: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),

    /** DSN MySQL/MariaDB: mysql://user:pass@host:port/database */
    DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi."),

    /** Secret better-auth, minimal 32 karakter. */
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET minimal 32 karakter."),

    /** Base URL better-auth (biasanya sama dengan APP_URL). */
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),

    /** Percaya header IP dari reverse proxy/platform tepercaya. */
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    /** Kredensial pengiriman email Resend; opsional bila email belum diaktifkan. */
    RESEND_API_KEY: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    /** Alamat pengirim yang sudah diverifikasi pada domain Resend. */
    RESEND_FROM: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),

    // --- TTE / BSrE (opsional; konfigurasi non-rahasia juga dapat diatur
    // lewat halaman /persuratan/tte) -------------------------------------
    TTE_MODE: z.string().trim().optional(),
    TTE_API: z.string().trim().optional(),
    TTE_USERNAME: z.string().trim().optional(),
    TTE_NIK: z.string().trim().optional(),
    /** Passphrase BSrE — JANGAN disimpan di basis data atau log. */
    TTE_PASSWORD: z.string().optional(),
    TTE_SSL: z.string().trim().optional(),
    /** Endpoint URL dan Token untuk WhatsApp Provider. */
    WHATSAPP_API_URL: z.string().url().optional(),
    WHATSAPP_TOKEN: z.string().optional(),
    /** Token webhook masuk; webhook menolak semua permintaan bila kosong. */
    EMAIL_WEBHOOK_TOKEN: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => value === undefined || value.length >= 32, {
        message: "EMAIL_WEBHOOK_TOKEN minimal 32 karakter.",
      }),
  })
  .superRefine(({ RESEND_API_KEY, RESEND_FROM }, context) => {
    if (RESEND_API_KEY && !RESEND_FROM) {
      context.addIssue({
        code: "custom",
        path: ["RESEND_FROM"],
        message: "RESEND_FROM wajib diisi saat RESEND_API_KEY dikonfigurasi.",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Validasi objek environment dan kembalikan nilai bertipe. */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Konfigurasi environment tidak valid:\n${z.prettifyError(result.error)}\n\n` +
        `Pastikan file .env sudah dibuat (lihat .env.example).`,
    );
  }

  return result.data;
}

export const env = parseEnv();
