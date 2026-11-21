import {
  boolean,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * Metadata video galeri. Video disematkan dari penyedia tepercaya (YouTube/Vimeo);
 * aplikasi tidak menerima unggahan video mentah agar tidak membuka jalur upload
 * executable/codec berbahaya dan pemborosan kuota penyimpanan.
 */
export const galeriVideo = mysqlTable(
  "galeri_video",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    judul: varchar("judul", { length: 150 }).notNull(),
    keterangan: text("keterangan"),
    url: varchar("url", { length: 500 }).notNull(),
    provider: varchar("provider", { length: 20 }).notNull(),
    thumbnail: varchar("thumbnail", { length: 255 }),
    aktif: boolean("aktif").notNull().default(true),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("galeri_video_village_published_idx").on(table.villageId, table.aktif, table.publishedAt),
    foreignKey({
      name: "galeri_video_village_fk",
      columns: [table.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
  ],
);
