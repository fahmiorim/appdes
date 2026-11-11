import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `letter_requirements` — master persyaratan surat (parity `ref_syarat_surat`).
 *
 * Satu syarat dapat dipakai banyak jenis surat; jenis surat menyimpan daftar
 * id syarat sebagai JSON (parity `tweb_surat_format.syarat_surat`).
 */
export const letterRequirements = mysqlTable(
  "letter_requirements",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Nama syarat, mis. "Fotokopi KTP". */
    name: varchar("name", { length: 150 }).notNull(),
    /** Keterangan tambahan / catatan kelengkapan berkas. */
    description: text("description"),

    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("letter_requirements_village_name_unique").on(table.villageId, table.name),
    index("letter_requirements_village_idx").on(table.villageId),
  ],
);

export type LetterRequirement = typeof letterRequirements.$inferSelect;
export type NewLetterRequirement = typeof letterRequirements.$inferInsert;
