import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { theme, villages, websiteTemplates, websiteTemplateVersions } from "@/db/schema";
import {
  tokenTemplateSchema,
  type StatusTemplate,
  type TokenTemplate,
} from "@/features/multi-desa/domain/template-website";
import { conflict, notFound } from "@/lib/errors";

/** Baris katalog beserta jumlah tenant yang memakainya. */
export interface TemplateWebsiteRow {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  version: string;
  status: StatusTemplate;
  tokens: TokenTemplate;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  jumlahTenant: number;
  /** Tenant yang masih memakai versi lama dari slug yang sama. */
  jumlahTertinggal: number;
}

export interface VersiTemplateWebsiteRow {
  id: number;
  version: string;
  changelog: string;
  createdAt: Date;
}

export interface PenggunaanTemplateWebsiteRow {
  villageId: number;
  namaDesa: string | null;
  domain: string | null;
  themeSlug: string;
  themeNama: string;
  versi: string;
  diperbaruiPada: Date;
}

function parseTokens(value: string): TokenTemplate {
  try {
    return tokenTemplateSchema.parse(JSON.parse(value));
  } catch {
    // Baris lama yang rusak tidak boleh membuat seluruh katalog gagal dibuka.
    return {
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#f59e0b",
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      fontHeading: "sans",
      radius: "sedang",
      style: "terang",
    };
  }
}

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

const kolomKatalog = {
  id: websiteTemplates.id,
  slug: websiteTemplates.slug,
  name: websiteTemplates.name,
  category: websiteTemplates.category,
  description: websiteTemplates.description,
  version: websiteTemplates.version,
  status: websiteTemplates.status,
  tokens: websiteTemplates.tokens,
  tags: websiteTemplates.tags,
  createdAt: websiteTemplates.createdAt,
  updatedAt: websiteTemplates.updatedAt,
  jumlahTenant: sql<number>`(
    SELECT COUNT(*) FROM theme t
    WHERE t.slug = website_templates.slug AND t.aktif = 1
  )`,
  jumlahTertinggal: sql<number>`(
    SELECT COUNT(*) FROM theme t
    WHERE t.slug = website_templates.slug
      AND t.aktif = 1
      AND t.versi <> website_templates.version
  )`,
};

function rapikan(row: {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  version: string;
  status: string;
  tokens: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  jumlahTenant: number;
  jumlahTertinggal: number;
}): TemplateWebsiteRow {
  return {
    ...row,
    status: row.status as StatusTemplate,
    tokens: parseTokens(row.tokens),
    tags: parseTags(row.tags),
    jumlahTenant: Number(row.jumlahTenant),
    jumlahTertinggal: Number(row.jumlahTertinggal),
  };
}

/** Semua template, terbaru lebih dulu. */
export async function listTemplateWebsite(): Promise<TemplateWebsiteRow[]> {
  const rows = await db
    .select(kolomKatalog)
    .from(websiteTemplates)
    .orderBy(desc(websiteTemplates.updatedAt), asc(websiteTemplates.name));

  return rows.map(rapikan);
}

/** Satu template; `null` bila id tidak ada. */
export async function getTemplateWebsite(id: number): Promise<TemplateWebsiteRow | null> {
  const [row] = await db
    .select(kolomKatalog)
    .from(websiteTemplates)
    .where(eq(websiteTemplates.id, id))
    .limit(1);
  return row ? rapikan(row) : null;
}

/** Riwayat versi sebuah template. */
export async function listVersiTemplateWebsite(
  templateId: number,
): Promise<VersiTemplateWebsiteRow[]> {
  return db
    .select({
      id: websiteTemplateVersions.id,
      version: websiteTemplateVersions.version,
      changelog: websiteTemplateVersions.changelog,
      createdAt: websiteTemplateVersions.createdAt,
    })
    .from(websiteTemplateVersions)
    .where(eq(websiteTemplateVersions.templateId, templateId))
    .orderBy(desc(websiteTemplateVersions.createdAt), desc(websiteTemplateVersions.id));
}

/** Tenant yang memakai template ini sebagai tema aktif. */
export async function listPenggunaanTemplateWebsite(
  template: Pick<TemplateWebsiteRow, "slug">,
): Promise<PenggunaanTemplateWebsiteRow[]> {
  return db
    .select({
      villageId: villages.id,
      namaDesa: villages.name,
      domain: sql<string | null>`(
        SELECT d.domain FROM village_domains d
        WHERE d.village_id = villages.id
        ORDER BY d.is_primary DESC, d.id ASC
        LIMIT 1
      )`,
      themeSlug: theme.slug,
      themeNama: theme.nama,
      versi: theme.versi,
      diperbaruiPada: theme.updatedAt,
    })
    .from(theme)
    .innerJoin(villages, eq(theme.villageId, villages.id))
    .where(and(eq(theme.slug, template.slug), eq(theme.aktif, true)))
    .orderBy(asc(villages.name));
}

export async function slugTemplateDipakai(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: websiteTemplates.id })
    .from(websiteTemplates)
    .where(eq(websiteTemplates.slug, slug))
    .limit(1);
  return Boolean(row);
}

/** Buat template baru beserta snapshot versi pertamanya. */
export async function buatTemplateWebsite(input: {
  slug: string;
  name: string;
  category: string;
  description: string;
  version: string;
  tokens: TokenTemplate;
  tags: string[];
  createdBy: string;
}): Promise<{ id: number }> {
  return db.transaction(async (tx) => {
    const [baris] = await tx
      .insert(websiteTemplates)
      .values({
        slug: input.slug,
        name: input.name,
        category: input.category,
        description: input.description,
        version: input.version,
        status: "draft",
        tokens: JSON.stringify(input.tokens),
        tags: JSON.stringify(input.tags),
        createdBy: input.createdBy,
      })
      .$returningId();

    if (!baris) throw conflict("Gagal menyimpan template website.");

    await tx.insert(websiteTemplateVersions).values({
      templateId: baris.id,
      version: input.version,
      changelog: "Versi awal template.",
      tokens: JSON.stringify(input.tokens),
    });

    return { id: baris.id };
  });
}

/**
 * Perbarui metadata template.
 *
 * Slug tidak dapat diubah karena menjadi kunci pencocokan tema tenant. Versi
 * baru hanya ditambahkan bila nomor versi berubah; perubahan deskripsi kecil
 * tidak memaksa penerbitan versi baru.
 */
export async function ubahTemplateWebsite(input: {
  id: number;
  name: string;
  category: string;
  description: string;
  version: string;
  tokens: TokenTemplate;
  tags: string[];
  changelog: string;
}): Promise<{ versiBaru: boolean }> {
  return db.transaction(async (tx) => {
    const [sebelum] = await tx
      .select({ version: websiteTemplates.version })
      .from(websiteTemplates)
      .where(eq(websiteTemplates.id, input.id))
      .limit(1);
    if (!sebelum) throw notFound("Template website tidak ditemukan.");

    await tx
      .update(websiteTemplates)
      .set({
        name: input.name,
        category: input.category,
        description: input.description,
        version: input.version,
        tokens: JSON.stringify(input.tokens),
        tags: JSON.stringify(input.tags),
      })
      .where(eq(websiteTemplates.id, input.id));

    if (sebelum.version === input.version) return { versiBaru: false };

    await tx.insert(websiteTemplateVersions).values({
      templateId: input.id,
      version: input.version,
      changelog: input.changelog.trim() || "Pembaruan template.",
      tokens: JSON.stringify(input.tokens),
    });

    return { versiBaru: true };
  });
}

/** Ubah status publikasi tanpa menghapus riwayat versi. */
export async function setStatusTemplateWebsite(id: number, status: StatusTemplate): Promise<void> {
  const hasil = await db
    .update(websiteTemplates)
    .set({ status })
    .where(eq(websiteTemplates.id, id));
  if (hasil[0].affectedRows === 0) throw notFound("Template website tidak ditemukan.");
}

/**
 * Perbarui versi tema tenant terpilih.
 *
 * Hanya baris `theme` dengan slug template yang sama dan masih aktif yang
 * disentuh. Id desa yang tidak memakai template ini diabaikan, sehingga form
 * yang dimanipulasi tidak dapat mengubah tema tenant lain.
 */
export async function distribusikanVersiTemplate(
  template: Pick<TemplateWebsiteRow, "slug" | "name" | "version">,
  villageIds: number[],
): Promise<number> {
  if (villageIds.length === 0) return 0;

  const hasil = await db
    .update(theme)
    .set({ nama: template.name, versi: template.version })
    .where(
      and(
        eq(theme.slug, template.slug),
        eq(theme.aktif, true),
        inArray(theme.villageId, villageIds),
      ),
    );

  return hasil[0].affectedRows;
}
