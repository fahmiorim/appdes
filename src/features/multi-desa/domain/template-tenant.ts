import { z } from "zod";

import { ACCESS_LEVELS } from "@/features/rbac/domain/permission";

/**
 * Template fondasi tenant (Fase 2).
 *
 * Sebelumnya desa baru dibentuk dengan menyalin role, modul, matriks akses,
 * tema, dan menu publik milik **desa pertama** yang kebetulan ada. Itu membuat
 * provisioning bergantung pada data tenant lain dan tidak mungkin dijalankan
 * pada instalasi baru yang belum punya desa sama sekali.
 *
 * Template ini adalah artefak platform yang berversi dan direview lewat
 * repository. Relasi antar-bagian memakai kunci alami (slug), bukan id, supaya
 * isinya tidak bergantung pada nomor baris database mana pun.
 *
 * Yang **bukan** bagian template: katalog jenis surat, buku bumindes, dan
 * kategori inventaris. Ketiganya data master milik desa (template surat memuat
 * kop, logo, dan format penomoran desa asal), sehingga tidak boleh diwariskan
 * diam-diam ke tenant lain.
 */

/** Slug role/modul: huruf kecil, angka, dan tanda hubung. */
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung.");

/** Role yang wajib ada karena dipakai saat membuat akun administrator desa. */
export const ROLE_ADMINISTRATOR = "administrator";

const roleSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(50),
  isSystem: z.boolean(),
});

const moduleSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(100),
  url: z.string().trim().max(255).nullable(),
  icon: z.string().trim().max(100).nullable(),
  isGroup: z.boolean(),
  isHidden: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0),
  /** Induk ditulis sebagai slug agar tidak bergantung pada id database. */
  parentSlug: slugSchema.nullable(),
});

const aksesSchema = z.object({
  roleSlug: slugSchema,
  moduleSlug: slugSchema,
  access: z.enum(ACCESS_LEVELS),
});

const temaSchema = z.object({
  slug: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(1).max(100),
  versi: z.string().trim().min(1).max(20),
  /** Opsi tema berupa JSON tervalidasi milik modul tema; `null` = bawaan. */
  opsi: z.string().nullable(),
});

const menuPublikSchema = z.object({
  nama: z.string().trim().min(1).max(50),
  link: z.string().trim().min(1).max(500),
  linkTipe: z.enum(["internal", "eksternal"]),
  aktif: z.boolean(),
  urut: z.number().int().min(0),
});

export const templateTenantSchema = z
  .object({
    versi: z.literal(1),
    sumber: z.object({
      jenis: z.enum(["bawaan", "ekspor"]),
      /** Diisi hanya bila template diekspor dari instalasi yang sudah berjalan. */
      villageId: z.number().int().positive().nullable(),
      dibuatPada: z.string().trim().min(10).max(10),
    }),
    roles: z.array(roleSchema).min(1),
    modules: z.array(moduleSchema),
    akses: z.array(aksesSchema),
    tema: temaSchema.nullable(),
    menuPublik: z.array(menuPublikSchema),
  })
  .superRefine((template, ctx) => {
    const roleSlugs = new Set<string>();
    for (const role of template.roles) {
      if (roleSlugs.has(role.slug)) {
        ctx.addIssue({
          code: "custom",
          path: ["roles"],
          message: `Role "${role.slug}" tercantum lebih dari sekali.`,
        });
      }
      roleSlugs.add(role.slug);
    }

    const moduleSlugs = new Set<string>();
    for (const modul of template.modules) {
      if (moduleSlugs.has(modul.slug)) {
        ctx.addIssue({
          code: "custom",
          path: ["modules"],
          message: `Modul "${modul.slug}" tercantum lebih dari sekali.`,
        });
      }
      moduleSlugs.add(modul.slug);
    }

    for (const [index, modul] of template.modules.entries()) {
      if (modul.parentSlug === null) continue;
      if (modul.parentSlug === modul.slug) {
        ctx.addIssue({
          code: "custom",
          path: ["modules", index, "parentSlug"],
          message: `Modul "${modul.slug}" tidak boleh menjadi induk dirinya sendiri.`,
        });
        continue;
      }
      if (!moduleSlugs.has(modul.parentSlug)) {
        ctx.addIssue({
          code: "custom",
          path: ["modules", index, "parentSlug"],
          message: `Induk "${modul.parentSlug}" tidak ada pada daftar modul template.`,
        });
      }
    }

    if (!roleSlugs.has(ROLE_ADMINISTRATOR)) {
      ctx.addIssue({
        code: "custom",
        path: ["roles"],
        message: `Template wajib memuat role "${ROLE_ADMINISTRATOR}".`,
      });
    }

    for (const [index, grant] of template.akses.entries()) {
      if (!roleSlugs.has(grant.roleSlug)) {
        ctx.addIssue({
          code: "custom",
          path: ["akses", index, "roleSlug"],
          message: `Role "${grant.roleSlug}" tidak ada pada daftar role template.`,
        });
      }
      if (!moduleSlugs.has(grant.moduleSlug)) {
        ctx.addIssue({
          code: "custom",
          path: ["akses", index, "moduleSlug"],
          message: `Modul "${grant.moduleSlug}" tidak ada pada daftar modul template.`,
        });
      }
    }

    const kunciAkses = new Set<string>();
    for (const [index, grant] of template.akses.entries()) {
      const kunci = `${grant.roleSlug}::${grant.moduleSlug}`;
      if (kunciAkses.has(kunci)) {
        ctx.addIssue({
          code: "custom",
          path: ["akses", index],
          message: `Akses ganda untuk role "${grant.roleSlug}" dan modul "${grant.moduleSlug}".`,
        });
      }
      kunciAkses.add(kunci);
    }
  });

export type TemplateTenant = z.infer<typeof templateTenantSchema>;

/** Validasi template; melempar `ZodError` bila isi tidak konsisten. */
export function parseTemplateTenant(input: unknown): TemplateTenant {
  return templateTenantSchema.parse(input);
}

/**
 * Urutkan modul agar induk selalu ditulis sebelum anaknya.
 *
 * Template boleh menuliskan modul dalam urutan bebas; database membutuhkan id
 * induk yang sudah ada. Fungsi murni ini mempertahankan urutan asli antar
 * simpul selevel dan melempar bila ada siklus (induk tidak pernah selesai).
 */
export function urutkanModulIndukDulu(
  modules: readonly TemplateTenant["modules"][number][],
): TemplateTenant["modules"] {
  const tersisa = [...modules];
  const selesai = new Set<string>();
  const hasil: TemplateTenant["modules"] = [];

  while (tersisa.length > 0) {
    const siap = tersisa.filter(
      (modul) => modul.parentSlug === null || selesai.has(modul.parentSlug),
    );
    if (siap.length === 0) {
      throw new Error("Template modul memiliki relasi induk melingkar.");
    }
    for (const modul of siap) {
      hasil.push(modul);
      selesai.add(modul.slug);
      tersisa.splice(tersisa.indexOf(modul), 1);
    }
  }

  return hasil;
}
