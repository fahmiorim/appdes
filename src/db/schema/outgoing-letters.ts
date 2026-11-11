import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

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
    classificationId: int("classification_id").references(() => letterClassifications.id, {
      onDelete: "set null",
    }),
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
    index("outgoing_letters_village_letter_date_idx").on(table.villageId, table.letterDate),
  ],
);

export type OutgoingLetter = typeof outgoingLetters.$inferSelect;
export type NewOutgoingLetter = typeof outgoingLetters.$inferInsert;
