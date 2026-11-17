import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { accounts, tenantDomainTombstones, users, villageDomains, villages } from "@/db/schema";
import type { DesaBaruInput } from "@/features/multi-desa/domain/desa-baru";
import {
  muatTemplateTenant,
  tulisFondasiTenant,
} from "@/features/multi-desa/infrastructure/template-tenant-repository";
import { conflict } from "@/lib/errors";

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
 * Fondasi (role, modul, matriks akses, tema, menu publik) berasal dari template
 * platform di `src/db/templates/tenant-template.ts`, **bukan** dari desa lain
 * yang kebetulan sudah ada. Karena itu provisioning berjalan pada instalasi baru
 * yang belum berisi desa sama sekali.
 *
 * Katalog surat, buku bumindes, dan kategori inventaris sengaja tidak dibuat:
 * ketiganya data master milik desa dan tidak boleh diwariskan dari tenant lain.
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

    // Domain milik desa yang sudah di-purge tetap dicadangkan (tombstone) agar
    // tenant baru tidak mewarisi identitas desa lama.
    const [tombstone] = await db
      .select({ id: tenantDomainTombstones.id })
      .from(tenantDomainTombstones)
      .where(eq(tenantDomainTombstones.domain, input.domain))
      .limit(1);
    if (tombstone) {
      throw conflict(
        "Domain tersebut milik desa yang sudah di-purge dan tidak dapat dipakai ulang.",
      );
    }
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

  // Validasi template sebelum menulis apa pun: template rusak tidak boleh
  // meninggalkan desa setengah jadi.
  const template = muatTemplateTenant();
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

    // Domain utama (alias lain dapat ditambahkan ke tabel yang sama).
    if (input.domain) {
      await tx.insert(villageDomains).values({ villageId, domain: input.domain, isPrimary: true });
    }

    const { adminRoleId } = await tulisFondasiTenant(tx, villageId, template);

    // Akun administrator desa baru.
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
