import "server-only";

import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import {
  MASA_TENGGANG_HARI,
  RETENSI_AUDIT_BULAN,
  UMUR_EKSPOR_HARI,
} from "@/features/multi-desa/domain/lifecycle-tenant";
import type { TemplateTenant } from "@/features/multi-desa/domain/template-tenant";
import { muatTemplateTenant } from "@/features/multi-desa/infrastructure/template-tenant-repository";
import { env } from "@/lib/env";

/** Template fondasi tenant yang dipakai saat provisioning. */
export async function getTemplateTenantPlatform(): Promise<TemplateTenant> {
  await requireSuperAdmin();
  return muatTemplateTenant();
}

/**
 * Ringkasan konfigurasi platform yang aman ditampilkan.
 *
 * Nilai rahasia (secret better-auth, kata sandi basis data, passphrase TTE,
 * kunci API) sengaja tidak pernah dibaca ke sini. Halaman hanya menampilkan
 * status aktif/tidak aktif dan allowlist host yang memang bukan rahasia.
 */
export interface KonfigurasiPlatformRingkas {
  appUrl: string;
  baseDomain: string | null;
  trustProxy: boolean;
  emailAktif: boolean;
  tteAktif: boolean;
  tteAllowedHosts: string[];
  retensi: {
    masaTenggangHari: number;
    umurEksporHari: number;
    retensiAuditBulan: number;
  };
}

export async function getKonfigurasiPlatform(): Promise<KonfigurasiPlatformRingkas> {
  await requireSuperAdmin();

  return {
    appUrl: env.APP_URL,
    baseDomain: env.DESA_BASE_DOMAIN ?? null,
    trustProxy: env.TRUST_PROXY,
    emailAktif: Boolean(env.RESEND_API_KEY && env.RESEND_FROM),
    tteAktif: Boolean(env.TTE_API),
    tteAllowedHosts: (env.TTE_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim())
      .filter((host) => host !== ""),
    retensi: {
      masaTenggangHari: MASA_TENGGANG_HARI,
      umurEksporHari: UMUR_EKSPOR_HARI,
      retensiAuditBulan: RETENSI_AUDIT_BULAN,
    },
  };
}
