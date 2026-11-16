import {
  foreignKey,
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { letters } from "./letters";
import { villages } from "./village";

/** Nomor surat yang pernah diterbitkan; tetap ada setelah surat dihapus. */
export const letterNumberArchive = mysqlTable(
  "letter_number_archive",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    letterId: int("letter_id"),
    number: varchar("number", { length: 50 }).notNull(),
    sequence: int("sequence").notNull(),
    year: int("year").notNull(),
    typeId: int("type_id").notNull(),
    classificationId: int("classification_id"),
    typeName: varchar("type_name", { length: 150 }).notNull(),
    issuedAt: timestamp("issued_at").notNull(),
  },
  (table) => [
    uniqueIndex("letter_number_archive_village_number_uq").on(table.villageId, table.number),
    uniqueIndex("letter_number_archive_letter_uq").on(table.letterId),
    index("letter_number_archive_type_year_idx").on(table.villageId, table.typeId, table.year),
    index("letter_number_archive_class_year_idx").on(
      table.villageId,
      table.classificationId,
      table.year,
    ),
    index("letter_number_archive_year_idx").on(table.villageId, table.year),
    index("letter_number_archive_village_letter_idx").on(table.villageId, table.letterId),
    // Composite `RESTRICT`: `village_id` child NOT NULL, sehingga composite
    // `SET NULL` tidak mungkin. `deleteSurat` melepas `letter_id` lebih dulu.
    foreignKey({
      name: "letter_number_archive_letter_tenant_fk",
      columns: [table.villageId, table.letterId],
      foreignColumns: [letters.villageId, letters.id],
    }).onDelete("restrict"),
  ],
);

export type LetterNumberArchive = typeof letterNumberArchive.$inferSelect;
