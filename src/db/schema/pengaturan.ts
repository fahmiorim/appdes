import { int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `pengaturan_desa` — pengaturan aplikasi terpusat per desa.
 *
 * Menyimpan nilai sebagai JSON pada kolom `nilai` dengan `kunci` bertipe
 * (lihat `features/pengaturan/domain/pengaturan.ts`). Baris yang tidak ada
 * berarti memakai bawaan domain, sehingga penambahan kunci baru tidak
 * memerlukan migrasi data.
 */
export const pengaturanDesa = mysqlTable(
  "pengaturan_desa",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kunci: varchar("kunci", { length: 100 }).notNull(),
    nilai: text("nilai"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("pengaturan_desa_village_kunci_uq").on(t.villageId, t.kunci)],
);

export type PengaturanDesa = typeof pengaturanDesa.$inferSelect;
export type NewPengaturanDesa = typeof pengaturanDesa.$inferInsert;
