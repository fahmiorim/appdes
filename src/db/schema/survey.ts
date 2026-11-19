import {
  date,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { analisisIndikator } from "./analisis-indikator";
import { villages } from "./village";

export const survey = mysqlTable(
  "survey",
  {
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
  },
  (t) => [uniqueIndex("survey_village_id_uq").on(t.villageId, t.id)],
);

export const surveySoal = mysqlTable(
  "survey_soal",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Denormalisasi tenant agar isolasi dijaga constraint, bukan hanya join induk. */
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    surveyId: int("survey_id").notNull(),
    pertanyaan: text("pertanyaan").notNull(),
    /** `text` (isian), `number` (angka), atau `choice` (pilihan ganda). */
    tipe: varchar("tipe", { length: 20 }).default("text"),
    /** Daftar pilihan (JSON array string) untuk soal bertipe `choice`. */
    pilihan: text("pilihan"),
    /** Bobot pertanyaan dalam skor (1–100). */
    bobot: int("bobot").notNull().default(1),
    /** Peta pilihan → skor 0–5 (JSON) untuk soal pilihan ganda. */
    skorPilihan: text("skor_pilihan"),
    /** Indikator analisis yang diukur pertanyaan ini; wajib satu tenant. */
    indikatorId: int("indikator_id"),
    urutan: int("urutan").default(0),
  },
  (t) => [
    uniqueIndex("survey_soal_village_id_uq").on(t.villageId, t.id),
    index("survey_soal_village_survey_idx").on(t.villageId, t.surveyId),
    index("survey_soal_village_indikator_idx").on(t.villageId, t.indikatorId),
    foreignKey({
      name: "survey_soal_survey_tenant_fk",
      columns: [t.villageId, t.surveyId],
      foreignColumns: [survey.villageId, survey.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "survey_soal_indikator_tenant_fk",
      columns: [t.villageId, t.indikatorId],
      foreignColumns: [analisisIndikator.villageId, analisisIndikator.id],
    }).onDelete("restrict"),
  ],
);

export const surveyResponden = mysqlTable(
  "survey_responden",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Denormalisasi tenant agar isolasi dijaga constraint, bukan hanya join induk. */
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    surveyId: int("survey_id").notNull(),
    nama: varchar("nama", { length: 150 }),
    nik: varchar("nik", { length: 16 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("survey_responden_village_id_uq").on(t.villageId, t.id),
    index("survey_responden_village_survey_idx").on(t.villageId, t.surveyId),
    foreignKey({
      name: "survey_responden_survey_tenant_fk",
      columns: [t.villageId, t.surveyId],
      foreignColumns: [survey.villageId, survey.id],
    }).onDelete("cascade"),
  ],
);

export const surveyJawaban = mysqlTable(
  "survey_jawaban",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Denormalisasi tenant agar isolasi dijaga constraint, bukan hanya join induk. */
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    respondenId: int("responden_id").notNull(),
    soalId: int("soal_id").notNull(),
    jawaban: text("jawaban"),
  },
  (t) => [
    index("survey_jawaban_village_responden_idx").on(t.villageId, t.respondenId),
    index("survey_jawaban_village_soal_idx").on(t.villageId, t.soalId),
    foreignKey({
      name: "survey_jawaban_responden_tenant_fk",
      columns: [t.villageId, t.respondenId],
      foreignColumns: [surveyResponden.villageId, surveyResponden.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "survey_jawaban_soal_tenant_fk",
      columns: [t.villageId, t.soalId],
      foreignColumns: [surveySoal.villageId, surveySoal.id],
    }).onDelete("cascade"),
  ],
);
