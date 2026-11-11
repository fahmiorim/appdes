import {
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { incomingLetters } from "./incoming-letters";
import { outgoingLetters } from "./outgoing-letters";
import { villages } from "./village";

export const incomingLetterDispositions = mysqlTable(
  "incoming_letter_dispositions",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    incomingLetterId: int("incoming_letter_id").notNull(),
    toUserId: varchar("to_user_id", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),
    toRole: varchar("to_role", { length: 50 }),
    instruction: varchar("instruction", { length: 255 }).notNull(),
    dueDate: varchar("due_date", { length: 10 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    note: varchar("note", { length: 255 }),
    /** JSON array: lampiran media paths `[{path, name, mime, size}]`. */
    lampiran: text("lampiran"),
    dispatchedBy: varchar("dispatched_by", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("incoming_letter_dispositions_village_idx").on(table.villageId),
    index("incoming_letter_dispositions_letter_idx").on(table.incomingLetterId),
    // Nama otomatis Drizzle melebihi batas 64 karakter MySQL, jadi dipendekkan.
    foreignKey({
      name: "ild_incoming_letter_id_fk",
      columns: [table.incomingLetterId],
      foreignColumns: [incomingLetters.id],
    }).onDelete("cascade"),
  ],
);

export const outgoingLetterShipments = mysqlTable(
  "outgoing_letter_shipments",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    outgoingLetterId: int("outgoing_letter_id").notNull(),
    sentDate: varchar("sent_date", { length: 10 }).notNull(),
    recipient: varchar("recipient", { length: 150 }),
    deliveryMethod: varchar("delivery_method", { length: 50 }),
    trackingNo: varchar("tracking_no", { length: 50 }),
    note: varchar("note", { length: 255 }),
    /** JSON array: lampiran media paths `[{path, name, mime, size}]`. */
    lampiran: text("lampiran"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("outgoing_letter_shipments_village_idx").on(table.villageId),
    index("outgoing_letter_shipments_letter_idx").on(table.outgoingLetterId),
    // Sama seperti disposisi: nama otomatis terlalu panjang untuk MySQL.
    foreignKey({
      name: "ols_outgoing_letter_id_fk",
      columns: [table.outgoingLetterId],
      foreignColumns: [outgoingLetters.id],
    }).onDelete("cascade"),
  ],
);

export const letterAgendaLogs = mysqlTable(
  "letter_agenda_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    letterId: int("letter_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    note: varchar("note", { length: 255 }),
    actorId: varchar("actor_id", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("letter_agenda_logs_village_idx").on(table.villageId)],
);

export type IncomingLetterDisposition = typeof incomingLetterDispositions.$inferSelect;
export type NewIncomingLetterDisposition = typeof incomingLetterDispositions.$inferInsert;
export type OutgoingLetterShipment = typeof outgoingLetterShipments.$inferSelect;
export type NewOutgoingLetterShipment = typeof outgoingLetterShipments.$inferInsert;
export type LetterAgendaLog = typeof letterAgendaLogs.$inferSelect;
export type NewLetterAgendaLog = typeof letterAgendaLogs.$inferInsert;

/**
 * Ekspedisi terpadu (lintas modul).
 *
 * Satu log untuk ekspedisi surat masuk, surat keluar, surat dinas, dan modul
 * lain (pengaduan, bimtek, dll.). Dipakai agar modul tidak menumpuk tabel
 * sendiri-sendiri.
 */
export const unifiedShipments = mysqlTable(
  "unified_shipments",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    /** Modul sumber: `surat_masuk`, `surat_keluar`, `surat_dinas`, `pengaduan`, dst. */
    sourceModule: varchar("source_module", { length: 50 }).notNull(),
    sourceId: int("source_id").notNull(),
    sentDate: varchar("sent_date", { length: 10 }).notNull(),
    recipient: varchar("recipient", { length: 150 }),
    deliveryMethod: varchar("delivery_method", { length: 50 }),
    trackingNo: varchar("tracking_no", { length: 50 }),
    note: varchar("note", { length: 255 }),
    /** JSON array lampiran. */
    lampiran: text("lampiran"),
    createdBy: varchar("created_by", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("unified_shipments_village_idx").on(table.villageId),
    index("unified_shipments_source_idx").on(table.sourceModule, table.sourceId),
  ],
);

/**
 * Rincian perubahan per field — rekam jejak detail per kolom.
 *
 * Setiap mutasi (tambah/ubah/hapus) disposisi, ekspedisi, atau data surat
 * agenda mencatat perubahan field secara rinci.
 */
export const suratAuditTrail = mysqlTable(
  "surat_audit_trail",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    /** Jenis entitas: `surat_masuk`, `surat_keluar`, `surat_dinas`, `disposisi`, `ekspedisi`. */
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: int("entity_id").notNull(),
    /** Nama field yang berubah. */
    fieldName: varchar("field_name", { length: 100 }).notNull(),
    /** Nilai lama (JSON-encoded; `null` untuk INSERT). */
    oldValue: text("old_value"),
    /** Nilai baru (JSON-encoded; `null` untuk DELETE). */
    newValue: text("new_value"),
    actorId: varchar("actor_id", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),
    /** Konteks tambahan: `create`, `update`, `delete`, `attachment_add`, `attachment_remove`. */
    action: varchar("action", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("surat_audit_trail_village_idx").on(table.villageId),
    index("surat_audit_trail_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type UnifiedShipment = typeof unifiedShipments.$inferSelect;
export type NewUnifiedShipment = typeof unifiedShipments.$inferInsert;
export type SuratAuditTrail = typeof suratAuditTrail.$inferSelect;
export type NewSuratAuditTrail = typeof suratAuditTrail.$inferInsert;
