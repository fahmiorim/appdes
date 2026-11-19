import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { roles, users, villages } from "@/db/schema";
import { deleteRole } from "@/features/rbac/infrastructure/rbac-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Migration 0017: trigger database memastikan akun desa hanya memakai role
 * desanya dan akun platform hanya memakai role platform, termasuk saat baris
 * dipindah lewat UPDATE langsung.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = String(Date.now()).slice(-7);

interface Fixture {
  desaA: number;
  desaB: number;
  roleA: number;
  roleB: number;
  rolePlatform: number;
  roleHapus: number;
  userA: string;
  userPlatform: string;
  userHapus: string;
}

let fixture: Fixture | null = null;

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi belum siap.");
  return fixture;
}

function idDari(row: { id: number } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed gagal: ${label}.`);
  return row.id;
}

async function kodeGalat(upaya: () => Promise<unknown>): Promise<unknown> {
  let current: unknown;
  try {
    await upaya();
  } catch (error) {
    current = error;
  }
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const item = current as { code?: unknown; errno?: unknown; cause?: unknown };
    const code = item.code ?? item.errno;
    if (code !== undefined) return code;
    current = item.cause;
  }
  return undefined;
}

function akun(villageId: number | null, roleId: number | null, label: string) {
  return {
    id: randomUUID(),
    name: `Akun ${label} ${RUN}`,
    email: `akun-${label}-${RUN}@example.test`,
    villageId,
    roleId,
  };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa RCT A ${RUN}`, code: `RCTA${RUN.slice(-4)}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa RCT B ${RUN}`, code: `RCTB${RUN.slice(-4)}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [roleARow] = await db
    .insert(roles)
    .values({ villageId: desaA, name: `Role A ${RUN}`, slug: `role-a-${RUN}` })
    .$returningId();
  const [roleBRow] = await db
    .insert(roles)
    .values({ villageId: desaB, name: `Role B ${RUN}`, slug: `role-b-${RUN}` })
    .$returningId();
  const [rolePlatformRow] = await db
    .insert(roles)
    .values({
      villageId: null,
      name: `Super Admin ${RUN}`,
      slug: "super-admin",
      isSystem: true,
    })
    .$returningId();
  const [roleHapusRow] = await db
    .insert(roles)
    .values({ villageId: desaA, name: `Role Hapus ${RUN}`, slug: `role-hapus-${RUN}` })
    .$returningId();

  const roleA = idDari(roleARow, "role A");
  const roleB = idDari(roleBRow, "role B");
  const rolePlatform = idDari(rolePlatformRow, "role platform");
  const roleHapus = idDari(roleHapusRow, "role hapus");
  const userA = akun(desaA, roleA, "a");
  const userPlatform = akun(null, rolePlatform, "platform");
  const userHapus = akun(desaA, roleHapus, "hapus");

  await db.insert(users).values([userA, userPlatform, userHapus]);

  fixture = {
    desaA,
    desaB,
    roleA,
    roleB,
    rolePlatform,
    roleHapus,
    userA: userA.id,
    userPlatform: userPlatform.id,
    userHapus: userHapus.id,
  };
});

afterAll(async () => {
  if (fixture === null) return;
  await db
    .delete(users)
    .where(inArray(users.id, [fixture.userA, fixture.userPlatform, fixture.userHapus]));
  await db
    .delete(roles)
    .where(
      inArray(roles.id, [fixture.roleA, fixture.roleB, fixture.rolePlatform, fixture.roleHapus]),
    );
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("AUD-035 trigger role tenant", () => {
  it("menerima role desa sendiri dan role platform pada akun platform", async () => {
    const current = dataUji();
    const rows = await db
      .select({ id: users.id, roleId: users.roleId })
      .from(users)
      .where(inArray(users.id, [current.userA, current.userPlatform]))
      .orderBy(users.id);
    const byId = new Map(rows.map((row) => [row.id, row.roleId]));

    expect(byId.get(current.userA)).toBe(current.roleA);
    expect(byId.get(current.userPlatform)).toBe(current.rolePlatform);
  });

  it("menolak akun desa yang memakai role desa lain", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.insert(users).values(akun(current.desaA, current.roleB, "lintas-desa")),
    );
    expect(code).toBe("ER_SIGNAL_EXCEPTION");
  });

  it("menolak akun desa yang memakai role platform", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.insert(users).values(akun(current.desaA, current.rolePlatform, "desa-platform")),
    );
    expect(code).toBe("ER_SIGNAL_EXCEPTION");
  });

  it("menolak akun platform yang memakai role desa", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.insert(users).values(akun(null, current.roleA, "platform-desa")),
    );
    expect(code).toBe("ER_SIGNAL_EXCEPTION");
  });

  it("menolak update yang memindahkan akun ke role desa lain", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.update(users).set({ roleId: current.roleB }).where(eq(users.id, current.userA)),
    );
    expect(code).toBe("ER_SIGNAL_EXCEPTION");
  });

  it("menolak update yang memindahkan akun desa ke tenant lain", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.update(users).set({ villageId: current.desaB }).where(eq(users.id, current.userA)),
    );
    expect(code).toBe("ER_SIGNAL_EXCEPTION");
  });

  it("menolak memindah tenant role yang masih dipakai", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.update(roles).set({ villageId: current.desaB }).where(eq(roles.id, current.roleA)),
    );
    expect(code).toBe("ER_SIGNAL_EXCEPTION");
  });

  it("mengizinkan pemindahan role yang belum dipakai", async () => {
    const current = dataUji();

    await db.update(roles).set({ villageId: current.desaA }).where(eq(roles.id, current.roleB));

    const [role] = await db
      .select({ villageId: roles.villageId })
      .from(roles)
      .where(eq(roles.id, current.roleB))
      .limit(1);
    expect(role?.villageId).toBe(current.desaA);
  });

  it("deleteRole melepas role anggota tenant sendiri lalu menghapus role", async () => {
    const current = dataUji();

    await deleteRole(current.desaA, current.roleHapus);

    const [anggota] = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, current.userHapus))
      .limit(1);
    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, current.roleHapus))
      .limit(1);

    expect(anggota?.roleId).toBeNull();
    expect(role).toBeUndefined();

    // Anggota role lain pada desa yang sama tidak ikut dilepas.
    const [anggotaA] = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, current.userA))
      .limit(1);
    expect(anggotaA?.roleId).toBe(current.roleA);
  });
});
