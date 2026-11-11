import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { env } from "@/lib/env";
import { notFound, validationError } from "@/lib/errors";

import { cariPlugin, envBelumSiap, PLUGIN_MANIFEST, type PluginManifest } from "../domain/plugin";
import { listStatusPlugin, simpanStatusPlugin } from "../infrastructure/plugin-repository";

export interface PluginView extends PluginManifest {
  aktif: boolean;
  envKurang: string[];
}

/** Daftar plugin manifest + status aktif + environment yang belum siap. */
export async function daftarPluginAdmin(): Promise<PluginView[]> {
  const user = await requirePermission(RESOURCES.plugin, "read");
  const villageId = await resolveVillageId(user);
  const status = await listStatusPlugin(villageId);
  const envSaatIni = env as unknown as Record<string, string | undefined>;

  return PLUGIN_MANIFEST.map((plugin) => ({
    ...plugin,
    aktif: status.get(plugin.slug) ?? false,
    envKurang: envBelumSiap(plugin, envSaatIni),
  }));
}

/**
 * Aktifkan/nonaktifkan plugin.
 *
 * Aktivasi ditolak bila environment wajib belum terisi agar status "aktif"
 * tidak menyesatkan operator.
 */
export async function ubahStatusPlugin(slug: string, aktif: boolean): Promise<PluginView> {
  const user = await requirePermission(RESOURCES.plugin, "delete");
  const villageId = await resolveVillageId(user);

  const plugin = cariPlugin(slug);
  if (!plugin) throw notFound("Plugin tidak dikenal.");

  const envSaatIni = env as unknown as Record<string, string | undefined>;
  const envKurang = envBelumSiap(plugin, envSaatIni);

  if (aktif && envKurang.length > 0) {
    throw validationError(
      `Plugin "${plugin.nama}" belum dapat diaktifkan: environment ${envKurang.join(", ")} belum diisi.`,
    );
  }

  await simpanStatusPlugin(villageId, plugin.slug, aktif);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: aktif ? AUDIT_EVENTS.pluginActivate : AUDIT_EVENTS.pluginDeactivate,
    resource: RESOURCES.plugin,
    resourceId: plugin.slug,
    details: { aktif, envKurang: envKurang.join(",") || null },
  });

  return { ...plugin, aktif, envKurang };
}
