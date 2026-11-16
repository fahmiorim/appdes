import {
  foreignKey,
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { letterClassifications } from "./letter-classifications";
import { villages } from "./village";

/**
 * `outgoing_letters` — buku agenda surat keluar.
 *
 * Sama seperti surat masuk, tanggal disimpan sebagai teks ISO (`YYYY-MM-DD`)
 * supaya bebas pergeseran zona waktu.
 */
export const outgoingLetters = mysqlTable(
  "outgoing_letters",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    agendaNumber: int("agenda_number").notNull().default(0),
    letterNumber: varchar("letter_number", { length: 50 }).notNull(),
    letterDate: varchar("letter_date", { length: 10 }).notNull(),
    recipient: varchar("recipient", { length: 150 }),
    classificationId: int("classification_id"),
    summary: varchar("summary", { length: 255 }),
    sentDate: varchar("sent_date", { length: 10 }),
    archiveLocation: varchar("archive_location", { length: 150 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Parent key untuk composite tenant FK `outgoing_letter_shipments`.
    uniqueIndex("outgoing_letters_village_id_uq").on(table.villageId, table.id),
    index("outgoing_letters_village_letter_date_idx").on(table.villageId, table.letterDate),
    index("outgoing_letters_village_classification_idx").on(
      table.villageId,
      table.classificationId,
    ),
    // Composite `RESTRICT`: referensi dilepas transaksi aplikasi sebelum hapus.
    foreignKey({
      name: "outgoing_letters_classification_tenant_fk",
      columns: [table.villageId, table.classificationId],
      foreignColumns: [letterClassifications.villageId, letterClassifications.id],
    }).onDelete("restrict"),
  ],
);

export type OutgoingLetter = typeof outgoingLetters.$inferSelect;
export type NewOutgoingLetter = typeof outgoingLetters.$inferInsert;
