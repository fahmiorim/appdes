import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accounts,
  bumindesBuku,
  inventarisKategori,
  letterClassifications,
  letterRequirements,
  letterTypes,
  menuPublik,
  modules,
  rolePermissions,
  roles,
  theme,
  users,
  villageDomains,
  villages,
} from "@/db/schema";
import type { DesaBaruInput } from "@/features/multi-desa/domain/desa-baru";
import { conflict } from "@/lib/errors";

/** Identitas tema bawaan yang dicatat saat provisioning desa. */
const DEFAULT_THEME_IDENTITAS = {
  slug: "esensi",
  nama: "Esensi",
  versi: "1.0.0",
} as const;

export interface DesaSuperAdminRow {
  id: number;
  name: string | null;
  code: string | null;
  domain: string | null;
  active: boolean;
  kuotaMediaMb: number | null;
  tema: string | null;
  pengguna: number;
  penduduk: number;
  jenisSurat: number;
  createdAt: Date;
}

/** Daftar seluruh desa beserta ringkasan isinya (khusus super admin). */
export async function listDesaSuperAdmin(): Promise<DesaSuperAdminRow[]> {
  const rows = await db
    .select({
      id: villages.id,
      name: villages.name,
      code: villages.code,
      domain: villages.domain,
      active: villages.active,
      kuotaMediaMb: villages.kuotaMediaMb,
      createdAt: villages.createdAt,
      tema: sql<string | null>`(
        SELECT t.slug FROM theme t
        WHERE t.village_id = ${villages.id} AND t.aktif = 1
        LIMIT 1 )`,
      // Kolom luar wajib dikualifikasi: interpolasi `${villages.id}` dirender
      // sebagai `id` polos di dalam subquery, sehingga `u.village_id = id`
      // terbaca sebagai `u.village_id = u.id` dan hitungan selalu 0.
      pengguna: sql<number>`(SELECT COUNT(*) FROM users u WHERE u.village_id = villages.id)`,
      penduduk: sql<number>`(SELECT COUNT(*) FROM residents r WHERE r.village_id = villages.id)`,
      jenisSurat: sql<number>`(
        SELECT COUNT(*) FROM letter_types lt WHERE lt.village_id = villages.id )`,
    })
    .from(villages)
    .orderBy(asc(villages.id));

  return rows.map((row) => ({
    ...row,
    pengguna: Number(row.pengguna),
    penduduk: Number(row.penduduk),
    jenisSurat: Number(row.jenisSurat),
  }));
}

function unwrapId(rows: { id: number }[]): number {
  const row = rows[0];
  if (!row) throw conflict("Operasi database tidak mengembalikan id.");
  return row.id;
}

function opsional(nilai: string | undefined): string | null {
  const bersih = nilai?.trim();
  return bersih ? bersih : null;
}

/** Label subdomain dari nama desa: huruf kecil, angka, dan tanda hubung. */
function slugDariNama(nama: string): string {
  const dasar = nama
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return dasar || "desa";
}

/**
 * Buat desa baru beserta seluruh fondasinya.
 *
 * Desa pertama dipakai sebagai **cetakan**: role, katalog modul, matriks akses,
 * tema aktif, menu publik, dan katalog surat disalin lalu seluruh id dipetakan
 * ulang ke desa baru. Ini menjaga menu/RBAC desa baru identik tanpa menduplikasi
 * data bawaan dalam kode aplikasi.
 *
 * Akun administrator desa dibuat langsung (bukan lewat `auth.api`) dengan hash
 * resmi better-auth agar login PIN/sandi tetap cocok.
 */
export async function provisionDesa(input: DesaBaruInput): Promise<{ id: number }> {
  if (input.domain) {
    const [domainAda] = await db
      .select({ villageId: villageDomains.villageId })
      .from(villageDomains)
      .where(eq(villageDomains.domain, input.domain))
      .limit(1);
    if (domainAda) throw conflict("Domain tersebut sudah dipakai desa lain.");
  }

  // Slug unik untuk wildcard `<slug>.<DESA_BASE_DOMAIN>`.
  const slugDipakai = new Set(
    (await db.select({ slug: villages.slug }).from(villages)).map((baris) => baris.slug),
  );
  const slugDasar = slugDariNama(input.name);
  let slug = slugDasar;
  for (let urutan = 2; slugDipakai.has(slug); urutan += 1) {
    slug = `${slugDasar}-${urutan}`;
  }

  const [usernameAda] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, input.adminUsername))
    .limit(1);
  if (usernameAda) throw conflict("Username admin sudah digunakan.");

  const [emailAda] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.adminEmail))
    .limit(1);
  if (emailAda) throw conflict("Email admin sudah digunakan.");

  const [sumber] = await db
    .select({ id: villages.id })
    .from(villages)
    .orderBy(asc(villages.id))
    .limit(1);
  if (!sumber) throw conflict("Belum ada desa sumber untuk menyalin fondasi.");

  const passwordHash = await hashPassword(input.adminPassword);

  return db.transaction(async (tx) => {
    const villageId = unwrapId(
      await tx
        .insert(villages)
        .values({
          name: input.name,
          code: input.code,
          slug,
          domain: input.domain,
          district: opsional(input.district),
          regency: opsional(input.regency),
          province: opsional(input.province),
          headName: opsional(input.headName),
          email: input.adminEmail,
          active: true,
          kuotaMediaMb: input.kuotaMediaMb ?? null,
        })
        .$returningId(),
    );

    // 0. Domain utama (alias lain dapat ditambahkan ke tabel yang sama).
    if (input.domain) {
      await tx.insert(villageDomains).values({ villageId, domain: input.domain, isPrimary: true });
    }

    // 1. Role — salin per slug.
    const sumberRoles = await tx
      .select({ id: roles.id, name: roles.name, slug: roles.slug, isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.villageId, sumber.id));
    if (sumberRoles.length === 0) throw conflict("Desa sumber belum memiliki role.");

    const roleIdBaru = new Map<number, number>();
    const roleIdPerSlug = new Map<string, number>();
    for (const role of sumberRoles) {
      const id = unwrapId(
        await tx
          .insert(roles)
          .values({
            villageId,
            name: role.name,
            slug: role.slug,
            isSystem: role.isSystem,
          })
          .$returningId(),
      );
      roleIdBaru.set(role.id, id);
      roleIdPerSlug.set(role.slug, id);
    }

    // 2. Modul — induk lebih dulu agar parent_id dapat dipetakan.
    const sumberModules = await tx
      .select({
        id: modules.id,
        slug: modules.slug,
        name: modules.name,
        url: modules.url,
        icon: modules.icon,
        isGroup: modules.isGroup,
        isHidden: modules.isHidden,
        isActive: modules.isActive,
        sortOrder: modules.sortOrder,
        parentId: modules.parentId,
      })
      .from(modules)
      .where(eq(modules.villageId, sumber.id));

    const modulIdBaru = new Map<number, number>();
    const modulIdPerSlug = new Map<string, number>();
    const berurutan = [...sumberModules].sort(
      (a, b) => Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)),
    );
    for (const modul of berurutan) {
      const parentLama = modul.parentId ?? 0;
      const parentId = parentLama ? (modulIdBaru.get(parentLama) ?? 0) : 0;
      const id = unwrapId(
        await tx
          .insert(modules)
          .values({
            villageId,
            slug: modul.slug,
            name: modul.name,
            url: modul.url,
            icon: modul.icon,
            isGroup: modul.isGroup,
            isHidden: modul.isHidden,
            isActive: modul.isActive,
            sortOrder: modul.sortOrder,
            parentId,
          })
          .$returningId(),
      );
      modulIdBaru.set(modul.id, id);
      modulIdPerSlug.set(modul.slug, id);
    }

    // 3. Matriks akses — role × modul.
    const sumberGrants = await tx
      .select({
        roleId: rolePermissions.roleId,
        moduleId: rolePermissions.moduleId,
        access: rolePermissions.access,
      })
      .from(rolePermissions)
      .where(
        inArray(
          rolePermissions.roleId,
          sumberRoles.map((role) => role.id),
        ),
      );

    for (const grant of sumberGrants) {
      const roleId = roleIdBaru.get(grant.roleId);
      const moduleId = modulIdBaru.get(grant.moduleId);
      if (roleId === undefined || moduleId === undefined) continue;
      await tx.insert(rolePermissions).values({ roleId, moduleId, access: grant.access });
    }

    // 4. Tema aktif.
    const [temaSumber] = await tx
      .select({ slug: theme.slug, nama: theme.nama, versi: theme.versi, opsi: theme.opsi })
      .from(theme)
      .where(and(eq(theme.villageId, sumber.id), eq(theme.aktif, true)))
      .limit(1);

    await tx.insert(theme).values({
      villageId,
      slug: temaSumber?.slug ?? DEFAULT_THEME_IDENTITAS.slug,
      nama: temaSumber?.nama ?? DEFAULT_THEME_IDENTITAS.nama,
      versi: temaSumber?.versi ?? DEFAULT_THEME_IDENTITAS.versi,
      sumber: "bawaan",
      aktif: true,
      opsi: temaSumber?.opsi ?? null,
    });

    // 5. Menu publik bawaan.
    const menuSumber = await tx
      .select({
        nama: menuPublik.nama,
        link: menuPublik.link,
        linkTipe: menuPublik.linkTipe,
        aktif: menuPublik.aktif,
        urut: menuPublik.urut,
      })
      .from(menuPublik)
      .where(eq(menuPublik.villageId, sumber.id));
    if (menuSumber.length > 0) {
      await tx
        .insert(menuPublik)
        .values(menuSumber.map((menu) => ({ villageId, parentId: null, ...menu })));
    }

    // 6. Katalog surat: syarat → klasifikasi → jenis (dengan remap id JSON).
    const syaratSumber = await tx
      .select({
        id: letterRequirements.id,
        name: letterRequirements.name,
        description: letterRequirements.description,
        sortOrder: letterRequirements.sortOrder,
        isActive: letterRequirements.isActive,
      })
      .from(letterRequirements)
      .where(eq(letterRequirements.villageId, sumber.id));

    const syaratIdBaru = new Map<number, number>();
    for (const syarat of syaratSumber) {
      const id = unwrapId(
        await tx
          .insert(letterRequirements)
          .values({
            villageId,
            name: syarat.name,
            description: syarat.description,
            sortOrder: syarat.sortOrder,
            isActive: syarat.isActive,
          })
          .$returningId(),
      );
      syaratIdBaru.set(syarat.id, id);
    }

    const klasifikasiSumber = await tx
      .select({
        id: letterClassifications.id,
        code: letterClassifications.code,
        name: letterClassifications.name,
      })
      .from(letterClassifications)
      .where(eq(letterClassifications.villageId, sumber.id));

    const klasifikasiIdBaru = new Map<number, number>();
    for (const klasifikasi of klasifikasiSumber) {
      const id = unwrapId(
        await tx
          .insert(letterClassifications)
          .values({ villageId, code: klasifikasi.code, name: klasifikasi.name })
          .$returningId(),
      );
      klasifikasiIdBaru.set(klasifikasi.id, id);
    }

    const jenisSumber = await tx
      .select()
      .from(letterTypes)
      .where(eq(letterTypes.villageId, sumber.id));
    for (const jenis of jenisSumber) {
      let syaratBaru: number[] = [];
      if (jenis.syaratSurat) {
        try {
          const ids = JSON.parse(jenis.syaratSurat) as unknown;
          if (Array.isArray(ids)) {
            syaratBaru = ids
              .map((id) => (typeof id === "number" ? syaratIdBaru.get(id) : undefined))
              .filter((id): id is number => id !== undefined);
          }
        } catch {
          syaratBaru = [];
        }
      }

      await tx.insert(letterTypes).values({
        villageId,
        code: jenis.code,
        name: jenis.name,
        classificationId:
          jenis.classificationId === null
            ? null
            : (klasifikasiIdBaru.get(jenis.classificationId) ?? null),
        templateBody: jenis.templateBody,
        templateBodyAlt: jenis.templateBodyAlt,
        formIsian: jenis.formIsian,
        kodeIsian: jenis.kodeIsian,
        syaratSurat: JSON.stringify(syaratBaru),
        requiresResident: jenis.requiresResident,
        isActive: jenis.isActive,
        numberFormat: jenis.numberFormat,
        formatNomorGlobal: jenis.formatNomorGlobal,
        validityMonths: jenis.validityMonths,
        satuanMasaBerlaku: jenis.satuanMasaBerlaku,
        sortOrder: jenis.sortOrder,
        qrCode: jenis.qrCode,
        qrCodeTte: jenis.qrCodeTte,
        logoGaruda: jenis.logoGaruda,
        kecamatan: jenis.kecamatan,
        orientasi: jenis.orientasi,
        ukuran: jenis.ukuran,
        margin: jenis.margin,
        header: jenis.header,
        footer: jenis.footer,
        sumberPendudukBerulang: jenis.sumberPendudukBerulang,
        templateVariant: jenis.templateVariant,
        layoutConfig: jenis.layoutConfig,
      });
    }

    // 7. Buku register bumindes & kategori inventaris (fondasi data master).
    const bukuSumber = await tx
      .select({
        kodeBuku: bumindesBuku.kodeBuku,
        namaBuku: bumindesBuku.namaBuku,
        uraian: bumindesBuku.uraian,
      })
      .from(bumindesBuku)
      .where(eq(bumindesBuku.villageId, sumber.id));
    if (bukuSumber.length > 0) {
      await tx.insert(bumindesBuku).values(bukuSumber.map((buku) => ({ villageId, ...buku })));
    }

    const kategoriSumber = await tx
      .select({
        kode: inventarisKategori.kode,
        nama: inventarisKategori.nama,
        golongan: inventarisKategori.golongan,
        keterangan: inventarisKategori.keterangan,
      })
      .from(inventarisKategori)
      .where(eq(inventarisKategori.villageId, sumber.id));
    if (kategoriSumber.length > 0) {
      await tx
        .insert(inventarisKategori)
        .values(kategoriSumber.map((kategori) => ({ villageId, ...kategori })));
    }

    // 8. Akun administrator desa baru.
    const adminRoleId = roleIdPerSlug.get("administrator");
    if (adminRoleId === undefined)
      throw conflict("Role administrator tidak ditemukan pada desa sumber.");

    const userId = randomUUID();
    await tx.insert(users).values({
      id: userId,
      name: input.adminName,
      email: input.adminEmail,
      emailVerified: true,
      username: input.adminUsername,
      displayUsername: input.adminUsername,
      roleId: adminRoleId,
      villageId,
      active: true,
      mustChangePin: false,
    });
    await tx.insert(accounts).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });

    return { id: villageId };
  });
}
