import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

/**
 * Tabel referensi kependudukan (katalog baku).
 *
 * Katalog ini **global** — tidak terikat desa — karena isinya baku secara
 * nasional. `id` diisi eksplisit (bukan autoincrement) agar kodenya stabil dan
 * sejalan dengan kode resmi; isinya dikelola lewat mekanisme backend.
 */

export const religions = mysqlTable("religions", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

/** Jenjang pendidikan terakhir yang ditamatkan. */
export const educations = mysqlTable("educations", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const occupations = mysqlTable("occupations", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const maritalStatuses = mysqlTable("marital_statuses", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

/** Status hubungan dalam keluarga (kepala keluarga, istri, anak, dst.). */
export const familyRelations = mysqlTable("family_relations", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const bloodTypes = mysqlTable("blood_types", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 20 }).notNull(),
});

export const citizenships = mysqlTable("citizenships", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});
