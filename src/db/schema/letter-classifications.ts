import { int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `letter_classifications` — klasifikasi (kode) surat, mis. "SK" untuk Surat
 * Keterangan, "SU" untuk Surat Undangan.
 *
 * Kode unik **per desa**, sehingga tiap desa bebas menyusun kosakata
 * klasifikasinya sendiri.
 */
export const letterClassifications = mysqlTable(
  "letter_classifications",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("letter_classifications_village_code_unique").on(table.villageId, table.code),
  ],
);
