import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { modules, rolePermissions, roles, villages } from "@/db/schema";
import {
  getRoleById,
  listLevelsByRole,
  setRolePermissions,
  updateRole,
  deleteRole,
} from "@/features/rbac/infrastructure/rbac-repository";
import { computeEffectivePermissions } from "@/features/rbac/application/authorization";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  villageA: number;
  villageB: number;
  roleA: number;
  roleB: number;
  moduleA: number;
  moduleB: number;
  globalAdmin: number;
  globalAdminCreated: boolean;
}

let fixture: Fixture | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

async function sisipkanLegacy(sql: string, values: unknown[]): Promise<number> {
  const connection = await mysql.createConnection(validasiDatabaseUji(process.env).opsiKoneksi);
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const [result] = await connection.query<ResultSetHeader>(sql, values);
    return result.insertId;
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.end();
  }
}

async function seedFixture(): Promise<Fixture> {
  const [villageARow] = await db
    .insert(villages)
    .values({ name: `Desa RBAC A ${RUN}`, code: `RBA${RUN}`.slice(0, 10) })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa RBAC B ${RUN}`, code: `RBB${RUN}`.slice(0, 10) })
    .$returningId();
  const villageA = pastiId(villageARow, "village A");
  const villageB = pastiId(villageBRow, "village B");

  const [roleARow] = await db
    .insert(roles)
    .values({ villageId: villageA, name: `Role A ${RUN}`, slug: `role-a-${RUN}` })
    .$returningId();
  const [roleBRow] = await db
    .insert(roles)
    .values({ villageId: villageB, name: `Role B ${RUN}`, slug: `role-b-${RUN}` })
    .$returningId();
  const [existingGlobalAdmin] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(isNull(roles.villageId), eq(roles.slug, "administrator")))
    .limit(1);
  let globalAdmin = existingGlobalAdmin?.id ?? 0;
  let globalAdminCreated = false;
  if (!existingGlobalAdmin) {
    const [globalAdminRow] = await db
      .insert(roles)
      .values({
        villageId: null,
        name: `Administrator ${RUN}`,
        slug: "administrator",
        isSystem: true,
      })
      .$returningId();
    globalAdmin = pastiId(globalAdminRow, "global administrator");
    globalAdminCreated = true;
  }

  const [moduleARow] = await db
    .insert(modules)
    .values({ villageId: villageA, name: `Modul A ${RUN}`, slug: `modul-a-${RUN}` })
    .$returningId();
  const [moduleBRow] = await db
    .insert(modules)
    .values({ villageId: villageB, name: `Modul Rahasia B ${RUN}`, slug: `modul-b-${RUN}` })
    .$returningId();

  const roleA = pastiId(roleARow, "role A");
  const roleB = pastiId(roleBRow, "role B");
  const moduleA = pastiId(moduleARow, "module A");
  const moduleB = pastiId(moduleBRow, "module B");

  await db.insert(rolePermissions).values({
    roleId: roleA,
    moduleId: moduleA,
    access: "read",
  });
  // Permission legacy lintas tenant: role A memiliki link ke modul B.
  await sisipkanLegacy(
    "INSERT INTO role_permissions (role_id, module_id, access) VALUES (?, ?, 'manage')",
    [roleA, moduleB],
  );

  return {
    villageA,
    villageB,
    roleA,
    roleB,
    moduleA,
    moduleB,
    globalAdmin,
    globalAdminCreated,
  };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  fixture = await seedFixture();
});

afterAll(async () => {
  if (!fixture) return;
  const roleIds = fixture.globalAdminCreated
    ? [fixture.roleA, fixture.roleB, fixture.globalAdmin]
    : [fixture.roleA, fixture.roleB];
  const moduleIds = [fixture.moduleA, fixture.moduleB];
  await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, roleIds));
  await db.delete(roles).where(inArray(roles.id, roleIds));
  await db.delete(modules).where(inArray(modules.id, moduleIds));
  await db.delete(villages).where(inArray(villages.id, [fixture.villageA, fixture.villageB]));
});

describe("isolasi tenant repository dan authorization RBAC", () => {
  it("membatasi role, modul, dan permission efektif pada tenant yang aktif", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    expect(await getRoleById(current.roleA, current.villageB)).toBeNull();
    expect(await getRoleById(current.roleA, current.villageA)).not.toBeNull();

    const levels = await listLevelsByRole(current.roleA, current.villageA);
    expect(levels.get(current.moduleA)).toBe("read");
    expect(levels.has(current.moduleB)).toBe(false);

    const permissionsA = await computeEffectivePermissions(current.roleA, current.villageA);
    expect(permissionsA.levelByResource.has(`modul-a-${RUN}`)).toBe(true);
    expect(permissionsA.levelByResource.has(`modul-b-${RUN}`)).toBe(false);

    const permissionsWrongTenant = await computeEffectivePermissions(current.roleB, current.villageA);
    expect(permissionsWrongTenant.levelByResource.size).toBe(0);

    const adminForTenant = await computeEffectivePermissions(current.globalAdmin, current.villageA);
    expect(adminForTenant.isSuperadmin).toBe(false);
    const globalAdmin = await computeEffectivePermissions(current.globalAdmin, null);
    expect(globalAdmin.isSuperadmin).toBe(true);
  });

  it("menolak menyimpan permission modul desa lain dan membatasi update/delete role", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    await expect(
      setRolePermissions(current.villageA, current.roleA, [
        { moduleId: current.moduleB, access: "manage" },
      ]),
    ).rejects.toThrow(/modul tidak ditemukan pada desa aktif/);

    const afterRejectedWrite = await listLevelsByRole(current.roleA, current.villageA);
    expect(afterRejectedWrite.get(current.moduleA)).toBe("read");
    expect(afterRejectedWrite.has(current.moduleB)).toBe(false);

    await updateRole(current.villageB, current.roleA, { name: `Tidak Boleh Diubah ${RUN}` });
    await deleteRole(current.villageB, current.roleA);

    const role = await getRoleById(current.roleA, current.villageA);
    expect(role?.name).toBe(`Role A ${RUN}`);
  });
});
