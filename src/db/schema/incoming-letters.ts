import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { letterClassifications } from "./letter-classifications";
import { villages } from "./village";

/**
 * `incoming_letters` — buku agenda surat masuk.
 *
 * Tanggal disimpan sebagai teks ISO (`YYYY-MM-DD`), bukan `timestamp`, agar
 * bebas dari pergeseran zona waktu: yang dicatat adalah *tanggal kalender* pada
 * lembar surat, bukan momen kejadian.
 */
export const incomingLetters = mysqlTable(
  "incoming_letters",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    agendaNumber: int("agenda_number").notNull().default(0),
    receivedDate: varchar("received_date", { length: 10 }).notNull(),
    letterNumber: varchar("letter_number", { length: 50 }).notNull(),
    letterDate: varchar("letter_date", { length: 10 }),
    sender: varchar("sender", { length: 150 }),
    classificationId: int("classification_id").references(() => letterClassifications.id, {
      onDelete: "set null",
    }),
    summary: varchar("summary", { length: 255 }),
    disposition: varchar("disposition", { length: 255 }),
    archiveLocation: varchar("archive_location", { length: 150 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("incoming_letters_village_received_idx").on(table.villageId, table.receivedDate),
  ],
);

export type IncomingLetter = typeof incomingLetters.$inferSelect;
export type NewIncomingLetter = typeof incomingLetters.$inferInsert;
