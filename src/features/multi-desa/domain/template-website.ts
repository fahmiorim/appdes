import { z } from "zod";

/** Kategori katalog tampilan website. Nilai disimpan sebagai slug. */
export const KATEGORI_TEMPLATE = [
  "umum",
  "pedesaan",
  "wisata",
  "budaya",
  "layanan",
  "sosial",
  "pemerintahan",
] as const;

export type KategoriTemplate = (typeof KATEGORI_TEMPLATE)[number];

export const LABEL_KATEGORI_TEMPLATE: Record<KategoriTemplate, string> = {
  umum: "Umum",
  pedesaan: "Pedesaan",
  wisata: "Wisata",
  budaya: "Budaya",
  layanan: "Layanan",
  sosial: "Sosial",
  pemerintahan: "Pemerintahan",
};

export const STATUS_TEMPLATE = ["draft", "published", "archived"] as const;
export type StatusTemplate = (typeof STATUS_TEMPLATE)[number];

export const LABEL_STATUS_TEMPLATE: Record<StatusTemplate, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Diarsipkan",
};

const slugSchema = z
  .string()
  .trim()
  .min(3, "Slug minimal 3 karakter.")
  .max(50, "Slug maksimal 50 karakter.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung.");

const versiSchema = z
  .string()
  .trim()
  .regex(/^\d+\.\d+\.\d+$/, "Versi harus berformat angka.angka.angka, mis. 1.0.0.");

const warnaSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus berupa kode heksadesimal 6 digit.");

export const tokenTemplateSchema = z.object({
  primary: warnaSchema,
  secondary: warnaSchema,
  accent: warnaSchema,
  background: warnaSchema,
  surface: warnaSchema,
  text: warnaSchema,
  /** Font judul; badan teks tetap memakai font sistem. */
  fontHeading: z.enum(["sans", "serif"]),
  radius: z.enum(["kecil", "sedang", "besar"]),
  style: z.enum(["terang", "gelap"]),
});

export type TokenTemplate = z.infer<typeof tokenTemplateSchema>;

const tagsSchema = z
  .array(z.string().trim().min(2).max(24))
  .max(6)
  .transform((tags) => [...new Set(tags)]);

const dasarTemplateSchema = z.object({
  name: z.string().trim().min(3, "Nama template minimal 3 karakter.").max(100),
  slug: slugSchema,
  category: z.enum(KATEGORI_TEMPLATE),
  description: z
    .string()
    .trim()
    .min(20, "Deskripsi minimal 20 karakter.")
    .max(600, "Deskripsi maksimal 600 karakter."),
  version: versiSchema,
  tags: tagsSchema,
  tokens: tokenTemplateSchema,
});

export const websiteTemplateInputSchema = dasarTemplateSchema;

export const websiteTemplateUpdateSchema = dasarTemplateSchema.omit({ slug: true }).extend({
  id: z.coerce.number().int().positive(),
  /** Wajib diisi bila versi berubah agar riwayat dapat ditelusuri. */
  changelog: z.string().trim().max(500).optional().default(""),
});

export const websiteTemplateStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(STATUS_TEMPLATE),
});

export const distribusiTemplateSchema = z.object({
  id: z.coerce.number().int().positive(),
  villageIds: z
    .array(z.coerce.number().int().positive())
    .min(1, "Pilih minimal satu desa.")
    .max(500, "Maksimal 500 desa dalam satu distribusi."),
});

export type WebsiteTemplateInput = z.infer<typeof websiteTemplateInputSchema>;
export type WebsiteTemplateUpdateInput = z.infer<typeof websiteTemplateUpdateSchema>;

/** Apakah template dapat dipakai tenant baru. */
export function templateDapatDipakai(status: StatusTemplate): boolean {
  return status === "published";
}

/** Bandingkan dua versi semver sederhana. */
export function bandingkanVersi(a: string, b: string): number {
  const bagianA = a.split(".").map(Number);
  const bagianB = b.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const selisih = (bagianA[index] ?? 0) - (bagianB[index] ?? 0);
    if (selisih !== 0) return selisih;
  }
  return 0;
}
