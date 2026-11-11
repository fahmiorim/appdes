/**
 * Manifest plugin integrasi.
 *
 * Plugin adalah integrasi pihak ketiga yang sudah dikenal saat build; tidak ada
 * unggahan atau eksekusi kode runtime. Aktivasi hanya mengubah status di
 * `plugin_registry`, sedangkan kredensial tetap berasal dari environment.
 */
export interface PluginManifest {
  slug: string;
  nama: string;
  deskripsi: string;
  /** Environment yang wajib terisi sebelum plugin boleh diaktifkan. */
  envKeys: readonly string[];
}

export const PLUGIN_MANIFEST: readonly PluginManifest[] = [
  {
    slug: "whatsapp-gateway",
    nama: "WhatsApp Gateway",
    deskripsi: "Kirim notifikasi warga melalui penyedia WhatsApp.",
    envKeys: ["WHATSAPP_API_URL", "WHATSAPP_TOKEN"],
  },
  {
    slug: "email-resend",
    nama: "Email (Resend)",
    deskripsi: "Kirim email transaksional melalui Resend.",
    envKeys: ["RESEND_API_KEY", "RESEND_FROM"],
  },
] as const;

export const PLUGIN_SLUGS = PLUGIN_MANIFEST.map((plugin) => plugin.slug);

export function cariPlugin(slug: string): PluginManifest | undefined {
  return PLUGIN_MANIFEST.find((plugin) => plugin.slug === slug);
}

/** Environment yang belum terisi untuk sebuah plugin. */
export function envBelumSiap(
  plugin: PluginManifest,
  env: Readonly<Record<string, string | undefined>>,
): string[] {
  return plugin.envKeys.filter((key) => {
    const nilai = env[key];
    return typeof nilai !== "string" || nilai.trim() === "";
  });
}
