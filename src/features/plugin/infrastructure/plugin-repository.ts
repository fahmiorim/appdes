import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pluginRegistry } from "@/db/schema/plugin-registry";

/** Peta slug → aktif untuk satu desa. */
export async function listStatusPlugin(villageId: number): Promise<Map<string, boolean>> {
  const rows = await db
    .select({ slug: pluginRegistry.slug, aktif: pluginRegistry.aktif })
    .from(pluginRegistry)
    .where(eq(pluginRegistry.villageId, villageId));

  return new Map(rows.map((row) => [row.slug, row.aktif]));
}

/** Simpan/ubah status satu plugin (upsert per desa+slug). */
export async function simpanStatusPlugin(
  villageId: number,
  slug: string,
  aktif: boolean,
): Promise<void> {
  await db
    .insert(pluginRegistry)
    .values({ villageId, slug, aktif })
    .onDuplicateKeyUpdate({ set: { aktif } });
}

/** Hapus baris status (kembali ke nonaktif bawaan). */
export async function hapusStatusPlugin(villageId: number, slug: string): Promise<void> {
  await db
    .delete(pluginRegistry)
    .where(and(eq(pluginRegistry.villageId, villageId), eq(pluginRegistry.slug, slug)));
}
