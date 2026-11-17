import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  accounts,
  modules,
  rolePermissions,
  roles,
  theme,
  users,
  villageDomains,
  villages,
} from "@/db/schema";
import { provisionDesa } from "@/features/multi-desa/infrastructure/provisioning-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Provisioning tenant dari template platform (Fase 2).
 *
 * Membuktikan desa baru dibentuk dari `TENANT_TEMPLATE`, bukan dengan menyalin
 * konfigurasi desa yang sudah ada. Fixture sengaja membuat desa "sumber" yang
 * kaya konfigurasi: bila provisioning masih menyalin desa pertama, tenant baru
 * akan mewarisi role/modul desa sumber dan test gagal.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

const KODE_SUMBER = `1${String(Date.now()).slice(-9)}`;
const KODE_BARU = `2${String(Date.now() + 1).slice(-9)}`;
const SLUG_SUMBER = `sumber-${RUN}`;
const DOMAIN_BARU = `tenant-baru-${RUN}.test`;
const USERNAME_ADMIN = `admin-${RUN}`;
const EMAIL_ADMIN = `admin-${RUN}@contoh.id`;

let sumberId: number | null = null;
let baruId: number | null = null;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [sumber] = await db
    .insert(villages)
    .values({ name: `Desa Sumber ${RUN}`, code: KODE_SUMBER, slug: SLUG_SUMBER })
    .$returningId();
  if (!sumber) throw new Error("Seed uji gagal: desa sumber tidak terbentuk");
  sumberId = sumber.id;

  // Konfigurasi desa sumber yang tidak boleh ikut terbawa ke tenant baru.
  const [roleSumber] = await db
    .insert(roles)
    .values({ villageId: sumber.id, name: "Administrator", slug: "administrator", isSystem: true })
    .$returningId();
  const [modulSumber] = await db
    .insert(modules)
    .values({ villageId: sumber.id, slug: "khusus-sumber", name: "Khusus Sumber", url: "/khusus" })
    .$returningId();
  if (!roleSumber || !modulSumber)
    throw new Error("Seed uji gagal: fondasi sumber tidak terbentuk");

  await db.insert(rolePermissions).values({
    roleId: roleSumber.id,
    moduleId: modulSumber.id,
    access: "manage",
  });
  await db
    .insert(theme)
    .values({ villageId: sumber.id, slug: "tema-sumber", nama: "Tema Sumber", aktif: true });
});

afterAll(async () => {
  const ids = [sumberId, baruId].filter((id): id is number => id !== null);
  if (ids.length === 0) return;

  const pengguna = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.villageId, ids));
  if (pengguna.length > 0) {
    await db.delete(accounts).where(
      inArray(
        accounts.userId,
        pengguna.map((baris) => baris.id),
      ),
    );
    await db.delete(users).where(inArray(users.villageId, ids));
  }

  const daftarRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.villageId, ids));
  if (daftarRole.length > 0) {
    await db.delete(rolePermissions).where(
      inArray(
        rolePermissions.roleId,
        daftarRole.map((baris) => baris.id),
      ),
    );
    await db.delete(roles).where(inArray(roles.villageId, ids));
  }

  await db.delete(modules).where(inArray(modules.villageId, ids));
  await db.delete(theme).where(inArray(theme.villageId, ids));
  await db.delete(villageDomains).where(inArray(villageDomains.villageId, ids));
  await db.delete(villages).where(inArray(villages.id, ids));
});

describe("provisioning desa dari template platform", () => {
  it("membentuk tenant baru tanpa mewarisi konfigurasi desa sumber", async () => {
    const hasil = await provisionDesa({
      name: `Desa Baru ${RUN}`,
      code: KODE_BARU,
      domain: DOMAIN_BARU,
      adminName: "Admin Desa Baru",
      adminUsername: USERNAME_ADMIN,
      adminEmail: EMAIL_ADMIN,
      adminPassword: "sandi-uji-panjang-2026",
      kuotaMediaMb: null,
    });
    baruId = hasil.id;

    const [desa] = await db
      .select({ name: villages.name, slug: villages.slug, active: villages.active })
      .from(villages)
      .where(eq(villages.id, hasil.id))
      .limit(1);
    expect(desa?.active).toBe(true);
    expect(desa?.slug).toBe(`desa-baru-${RUN}`);

    const roleBaru = await db
      .select({ slug: roles.slug, isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.villageId, hasil.id));
    expect(roleBaru).toEqual([{ slug: "administrator", isSystem: true }]);

    // Template bawaan tidak membawa modul desa sumber mana pun.
    const modulBaru = await db
      .select({ slug: modules.slug })
      .from(modules)
      .where(eq(modules.villageId, hasil.id));
    expect(modulBaru).toEqual([]);

    const temaBaru = await db
      .select({ slug: theme.slug, aktif: theme.aktif })
      .from(theme)
      .where(eq(theme.villageId, hasil.id));
    expect(temaBaru).toEqual([{ slug: "esensi", aktif: true }]);

    const [domainBaru] = await db
      .select({ domain: villageDomains.domain, isPrimary: villageDomains.isPrimary })
      .from(villageDomains)
      .where(eq(villageDomains.villageId, hasil.id))
      .limit(1);
    expect(domainBaru).toEqual({ domain: DOMAIN_BARU, isPrimary: true });
  });

  it("membuat akun administrator desa dengan role milik tenant sendiri", async () => {
    if (baruId === null) throw new Error("Tenant uji belum terbentuk.");

    const [admin] = await db
      .select({ id: users.id, roleId: users.roleId, villageId: users.villageId })
      .from(users)
      .where(eq(users.username, USERNAME_ADMIN))
      .limit(1);
    if (!admin) throw new Error("Akun administrator desa tidak terbentuk.");

    const [roleTenant] = await db
      .select({ villageId: roles.villageId })
      .from(roles)
      .where(eq(roles.id, admin.roleId ?? 0))
      .limit(1);

    expect(admin.villageId).toBe(baruId);
    expect(roleTenant?.villageId).toBe(baruId);

    const [kredensial] = await db
      .select({ providerId: accounts.providerId })
      .from(accounts)
      .where(eq(accounts.userId, admin.id))
      .limit(1);
    expect(kredensial?.providerId).toBe("credential");
  });

  it("menolak domain yang sudah dipakai tenant lain", async () => {
    if (sumberId === null) throw new Error("Fixture desa sumber tidak siap.");

    await expect(
      provisionDesa({
        name: `Desa Bentrok ${RUN}`,
        code: `3${String(Date.now() + 2).slice(-9)}`,
        domain: DOMAIN_BARU,
        adminName: "Admin Bentrok",
        adminUsername: `bentrok-${RUN}`,
        adminEmail: `bentrok-${RUN}@contoh.id`,
        adminPassword: "sandi-uji-panjang-2026",
        kuotaMediaMb: null,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
