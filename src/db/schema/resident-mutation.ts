import {
  date,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { RESIDENT_MUTATION_TYPES } from "@/lib/resident-mutation";

import { users } from "./auth";
import { regions } from "./region";
import { residents } from "./resident";
import { villages } from "./village";

export {
  RESIDENT_MUTATION_TYPE_LABELS,
  RESIDENT_MUTATION_TYPES,
  type ResidentMutationType,
} from "@/lib/resident-mutation";

export const residentMutations = mysqlTable(
  "resident_mutations",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id"),
    type: mysqlEnum("type", RESIDENT_MUTATION_TYPES).notNull(),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    reportedAt: timestamp("reported_at").notNull().defaultNow(),
    actorId: varchar("actor_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    reason: varchar("reason", { length: 255 }),
    notes: text("notes"),
    referenceNo: varchar("reference_no", { length: 100 }),
    fromRegionId: int("from_region_id"),
    toRegionId: int("to_region_id"),
    fromAddress: varchar("from_address", { length: 255 }),
    toAddress: varchar("to_address", { length: 255 }),
    meta: json("meta"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("resident_mutations_village_type_idx").on(t.villageId, t.type),
    index("resident_mutations_village_date_idx").on(t.villageId, t.eventDate),
    index("resident_mutations_resident_idx").on(t.residentId),
    index("resident_mutations_village_resident_idx").on(t.villageId, t.residentId),
    index("resident_mutations_village_from_region_idx").on(t.villageId, t.fromRegionId),
    index("resident_mutations_village_to_region_idx").on(t.villageId, t.toRegionId),
    index("resident_mutations_reported_at_idx").on(t.reportedAt),
    foreignKey({
      name: "resident_mutations_resident_tenant_fk",
      columns: [t.villageId, t.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "resident_mutations_from_region_tenant_fk",
      columns: [t.villageId, t.fromRegionId],
      foreignColumns: [regions.villageId, regions.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "resident_mutations_to_region_tenant_fk",
      columns: [t.villageId, t.toRegionId],
      foreignColumns: [regions.villageId, regions.id],
    }).onDelete("restrict"),
  ],
);

export type ResidentMutation = typeof residentMutations.$inferSelect;
export type NewResidentMutation = typeof residentMutations.$inferInsert;
