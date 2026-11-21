import {
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Katalog template tampilan website platform.
 *
 * Template adalah metadata tampilan yang dapat dipilih tenant, bukan paket kode
 * yang diunggah saat runtime. Token warna/font divalidasi lalu dipakai oleh
 * komponen situs publik yang sudah ada untuk menyesuaikan identitas visual.
 */
export const websiteTemplates = mysqlTable(
  "website_templates",
  {
    id: int("id").autoincrement().primaryKey(),

    /** Slug stabil untuk pencocokan dengan `theme.slug` milik tenant. */
    slug: varchar("slug", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 30 }).notNull(),
    description: text("description").notNull(),

    /** Versi aktif pada katalog, mis. `1.0.0`. */
    version: varchar("version", { length: 20 }).notNull(),
    /** `draft` | `published` | `archived`. */
    status: varchar("status", { length: 20 }).notNull().default("draft"),

    /** Token tampilan tervalidasi Zod, disimpan sebagai JSON. */
    tokens: text("tokens").notNull(),
    /** Label pencarian, disimpan sebagai JSON array string. */
    tags: text("tags").notNull(),

    /** Akun platform yang membuat entri katalog; `null` untuk data bawaan. */
    createdBy: varchar("created_by", { length: 36 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("website_templates_slug_unique").on(table.slug),
    index("website_templates_status_idx").on(table.status),
    index("website_templates_category_idx").on(table.category),
  ],
);

/**
 * Riwayat versi template.
 *
 * Setiap versi menyimpan snapshot token agar perubahan tampilan dapat ditelusuri
 * tanpa mengubah baris versi lama. Baris ini tidak menyimpan kode atau berkas
 * unggahan.
 */
export const websiteTemplateVersions = mysqlTable(
  "website_template_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    templateId: int("template_id")
      .notNull()
      .references(() => websiteTemplates.id, { onDelete: "cascade" }),
    version: varchar("version", { length: 20 }).notNull(),
    changelog: text("changelog").notNull(),
    tokens: text("tokens").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("website_template_versions_template_version_unique").on(
      table.templateId,
      table.version,
    ),
  ],
);

export type WebsiteTemplate = typeof websiteTemplates.$inferSelect;
export type NewWebsiteTemplate = typeof websiteTemplates.$inferInsert;
export type WebsiteTemplateVersion = typeof websiteTemplateVersions.$inferSelect;
export type NewWebsiteTemplateVersion = typeof websiteTemplateVersions.$inferInsert;
