import { date, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { analisisIndikator } from "./analisis-indikator";
import { villages } from "./village";

export const survey = mysqlTable("survey", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  judul: varchar("judul", { length: 200 }).notNull(),
  deskripsi: text("deskripsi"),
  /** Sasaran responden, mis. "Warga usia produktif". */
  sasaran: varchar("sasaran", { length: 200 }),
  /** Periode pengisian publik (inklusif); null = tanpa batas. */
  mulai: date("mulai", { mode: "string" }),
  selesai: date("selesai", { mode: "string" }),
  aktif: int("aktif").default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const surveySoal = mysqlTable("survey_soal", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("survey_id")
    .notNull()
    .references(() => survey.id, { onDelete: "cascade" }),
  pertanyaan: text("pertanyaan").notNull(),
  /** `text` (isian), `number` (angka), atau `choice` (pilihan ganda). */
  tipe: varchar("tipe", { length: 20 }).default("text"),
  /** Daftar pilihan (JSON array string) untuk soal bertipe `choice`. */
  pilihan: text("pilihan"),
  /** Bobot pertanyaan dalam skor (1–100). */
  bobot: int("bobot").notNull().default(1),
  /** Peta pilihan → skor 0–5 (JSON) untuk soal pilihan ganda. */
  skorPilihan: text("skor_pilihan"),
  /** Indikator analisis yang diukur pertanyaan ini. */
  indikatorId: int("indikator_id").references(() => analisisIndikator.id, {
    onDelete: "set null",
  }),
  urutan: int("urutan").default(0),
});

export const surveyResponden = mysqlTable("survey_responden", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("survey_id")
    .notNull()
    .references(() => survey.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 150 }),
  nik: varchar("nik", { length: 16 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const surveyJawaban = mysqlTable("survey_jawaban", {
  id: int("id").autoincrement().primaryKey(),
  respondenId: int("responden_id")
    .notNull()
    .references(() => surveyResponden.id, { onDelete: "cascade" }),
  soalId: int("soal_id")
    .notNull()
    .references(() => surveySoal.id, { onDelete: "cascade" }),
  jawaban: text("jawaban"),
});
