import { boolean, index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/** Kotak masuk email per desa yang diisi webhook terautentikasi. */
export const mailboxPesan = mysqlTable(
  "mailbox_pesan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    arah: varchar("arah", { length: 10 }).$type<"masuk" | "keluar">().notNull(),
    alamat: varchar("alamat", { length: 255 }).notNull(),
    subjek: varchar("subjek", { length: 255 }),
    isi: text("isi").notNull(),
    dibaca: boolean("dibaca").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("mailbox_pesan_village_created_idx").on(t.villageId, t.createdAt)],
);

export type MailboxPesan = typeof mailboxPesan.$inferSelect;
