import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  accounts,
  menuPublik,
  modules,
  rolePermissions,
  roles,
  theme,
  users,
  villageDomains,
  villages,
} from "@/db/schema";
import { parseTemplateTenant } from "@/features/multi-desa/domain/template-tenant";
import { provisionDesa } from "@/features/multi-desa/infrastructure/provisioning-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Alat ekspor template tenant (`scripts/platform/export-template.mjs`).
 *
 * Dijalankan sebagai proses terpisah agar yang diuji benar-benar CLI yang
 * dipakai operator: koneksi `DATABASE_URL`, pemilihan desa, keluaran JSON, dan
 * perlindungan berkas tujuan.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const SKRIP = path.join(process.cwd(), "scripts", "platform", "export-template.mjs");
const RUN = randomUUID().slice(0, 8);

let villageId: number | null = null;
let slug = "";
let folderSementara = "";

function jalankanEkspor(args: string[], env: Record<string, string> = {}) {
  return execFileSync(process.execPath, [SKRIP, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL ?? "", ...env },
  });
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const hasil = await provisionDesa({
    name: `Desa Ekspor ${RUN}`,
    code: `6${String(Date.now()).slice(-9)}`,
    domain: `ekspor-${RUN}.test`,
    adminName: "Admin Ekspor",
    adminUsername: `admin-ekspor-${RUN}`,
    adminEmail: `admin-ekspor-${RUN}@contoh.id`,
    adminPassword: "sandi-uji-panjang-2026",
    kuotaMediaMb: null,
  });
  villageId = hasil.id;
  slug =
    (
      await db
        .select({ slug: villages.slug })
        .from(villages)
        .where(eq(villages.id, hasil.id))
        .limit(1)
    )[0]?.slug ?? "";

  // Konfigurasi tambahan supaya ekspor punya modul, akses, dan menu.
  const [modul] = await db
    .insert(modules)
    .values({
      villageId: hasil.id,
      slug: "beranda",
      name: "Beranda",
      url: "/beranda",
      sortOrder: 0,
      parentId: 0,
    })
    .$returningId();
  const [roleAdmin] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.villageId, hasil.id))
    .limit(1);
  if (!modul || !roleAdmin) throw new Error("Seed uji ekspor gagal.");

  await db
    .insert(rolePermissions)
    .values({ roleId: roleAdmin.id, moduleId: modul.id, access: "manage" });
  await db.insert(menuPublik).values({
    villageId: hasil.id,
    nama: "Beranda",
    link: "/",
    linkTipe: "internal",
    aktif: true,
    urut: 0,
  });

  folderSementara = mkdtempSync(path.join(tmpdir(), "appdes-ekspor-"));
});

afterAll(async () => {
  if (folderSementara) rmSync(folderSementara, { recursive: true, force: true });
  if (villageId === null) return;

  await db.delete(menuPublik).where(eq(menuPublik.villageId, villageId));
  await db
    .delete(rolePermissions)
    .where(
      eq(
        rolePermissions.roleId,
        (await db.select({ id: roles.id }).from(roles).where(eq(roles.villageId, villageId)))[0]
          ?.id ?? 0,
      ),
    );
  await db.delete(modules).where(eq(modules.villageId, villageId));
  await db.delete(theme).where(eq(theme.villageId, villageId));
  await db.delete(villageDomains).where(eq(villageDomains.villageId, villageId));
  await db
    .delete(accounts)
    .where(
      eq(
        accounts.userId,
        (await db.select({ id: users.id }).from(users).where(eq(users.villageId, villageId)))[0]
          ?.id ?? "",
      ),
    );
  await db.delete(users).where(eq(users.villageId, villageId));
  await db.delete(roles).where(eq(roles.villageId, villageId));
  await db.delete(villages).where(eq(villages.id, villageId));
});

describe("alat ekspor template tenant", () => {
  it("mencetak template valid dari instalasi referensi", () => {
    const keluaran = jalankanEkspor(["--village", slug]);
    const template = parseTemplateTenant(JSON.parse(keluaran));

    expect(template.sumber).toMatchObject({ jenis: "ekspor", villageId });
    expect(template.roles.map((role) => role.slug)).toContain("administrator");
    expect(template.modules.map((modul) => modul.slug)).toEqual(["beranda"]);
    expect(template.akses).toEqual([
      { roleSlug: "administrator", moduleSlug: "beranda", access: "manage" },
    ]);
    expect(template.menuPublik).toEqual([
      { nama: "Beranda", link: "/", linkTipe: "internal", aktif: true, urut: 0 },
    ]);
    expect(template.tema?.slug).toBe("esensi");
  });

  it("menulis berkas dengan ringkasan JSON dan menolak menimpa tanpa --force", () => {
    const tujuan = path.join(folderSementara, "template-tenant.json");

    const ringkasan = JSON.parse(
      jalankanEkspor(["--village", slug, "--out", tujuan, "--json"]),
    ) as { ok: boolean; out: string; modules: number; akses: number };

    expect(ringkasan.ok).toBe(true);
    expect(ringkasan.out).toBe(tujuan);
    expect(ringkasan.modules).toBe(1);
    expect(ringkasan.akses).toBe(1);
    expect(existsSync(tujuan)).toBe(true);
    parseTemplateTenant(JSON.parse(readFileSync(tujuan, "utf8")));

    expect(() => jalankanEkspor(["--village", slug, "--out", tujuan])).toThrow();
    expect(() => jalankanEkspor(["--village", slug, "--out", tujuan, "--force"])).not.toThrow();
  });

  it("menolak desa referensi yang tidak ada", () => {
    expect(() => jalankanEkspor(["--village", `tidak-ada-${RUN}`])).toThrow();
  });
});
