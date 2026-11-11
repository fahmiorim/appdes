import { boolean, int, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `plugin_registry` — status aktif plugin integrasi per desa.
 *
 * Kode plugin tidak diunggah atau dieksekusi saat runtime; daftar plugin berasal
 * dari manifest build-time di `features/plugin/domain/plugin.ts`. Tabel ini
 * hanya menyimpan pilihan aktif/nonaktif.
 */
export const pluginRegistry = mysqlTable(
  "plugin_registry",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 80 }).notNull(),
    aktif: boolean("aktif").notNull().default(false),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("plugin_registry_village_slug_uq").on(t.villageId, t.slug)],
);

export type PluginRegistryRow = typeof pluginRegistry.$inferSelect;
