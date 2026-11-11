import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray, sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { villageDomains, villages } from "@/db/schema";
import { susunPetaDesa, villageIdDariHost } from "@/features/desa/domain/tenant";
import { listVillageDomains } from "@/features/desa/infrastructure/desa-repository";
import { jalankanMigrasiUji } from "@/testing/migrasi-uji";

/**
 * Uji isolasi host multi-desa pada lapisan data.
 *
 * Membuktikan `village_domains` mendukung banyak host per desa (domain utama +
 * alias), wildcard `<slug>.<base>` memetakan ke desa yang benar, dan host yang
 * tidak dikenal tidak pernah jatuh ke desa lain saat instalasi berisi >1 desa.
 * Berjalan pada `desa_test` dan di-skip bila MySQL tidak tersedia.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

const DOMAIN_A = `desa-a-${RUN}.test`;
const DOMAIN_ALIAS_A = `alias-a-${RUN}.test`;
const DOMAIN_B = `desa-b-${RUN}.test`;
const SLUG_A = `desa-a-${RUN}`;
const SLUG_B = `desa-b-${RUN}`;
const BASE_DOMAIN = "desa.test";

let dbReady = false;
let fixture: { desaA: number; desaB: number } | null = null;

beforeAll(async () => {
  const dsn = process.env.DATABASE_URL ?? "";
  try {
    const dbName = new URL(dsn).pathname.replace(/^\//, "") || "desa_test";
    const server = await mysql.createConnection(dsn.replace(/\/[^/]*$/, ""));
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await server.end();
    await db.execute(sql`SELECT 1`);
  } catch {
    return;
  }

  dbReady = true;
  await jalankanMigrasiUji(db, { dsn, migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa Host A ${RUN}`, code: `HA${RUN}`, slug: SLUG_A })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa Host B ${RUN}`, code: `HB${RUN}`, slug: SLUG_B })
    .$returningId();

  const desaA = desaARow?.id;
  const desaB = desaBRow?.id;
  if (desaA === undefined || desaB === undefined) {
    throw new Error("Seed uji gagal: desa tidak terbentuk");
  }

  await db.insert(villageDomains).values([
    { villageId: desaA, domain: DOMAIN_A, isPrimary: true },
    { villageId: desaA, domain: DOMAIN_ALIAS_A, isPrimary: false },
    { villageId: desaB, domain: DOMAIN_B, isPrimary: true },
  ]);

  fixture = { desaA, desaB };
});

afterAll(async () => {
  if (!dbReady || !fixture) return;

  const desaIds = [fixture.desaA, fixture.desaB];
  await db.delete(villageDomains).where(inArray(villageDomains.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("isolasi host multi-desa", () => {
  it("memetakan domain utama dan alias ke desa yang sama", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    const peta = susunPetaDesa(await listVillageDomains(), BASE_DOMAIN);

    expect(villageIdDariHost(DOMAIN_A, peta)).toBe(fixture.desaA);
    expect(villageIdDariHost(DOMAIN_ALIAS_A, peta)).toBe(fixture.desaA);
    expect(villageIdDariHost(DOMAIN_B, peta)).toBe(fixture.desaB);
    expect(peta.jumlahDesa).toBeGreaterThanOrEqual(2);
  });

  it("memetakan wildcard <slug>.<base> ke desa pemilik slug", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    const peta = susunPetaDesa(await listVillageDomains(), BASE_DOMAIN);

    expect(villageIdDariHost(`${SLUG_A}.${BASE_DOMAIN}`, peta)).toBe(fixture.desaA);
    expect(villageIdDariHost(`${SLUG_B}.${BASE_DOMAIN}`, peta)).toBe(fixture.desaB);
  });

  it("tidak jatuh ke desa lain untuk host tak dikenal atau label bertingkat", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    const peta = susunPetaDesa(await listVillageDomains(), BASE_DOMAIN);

    expect(villageIdDariHost(`tidak-ada-${RUN}.${BASE_DOMAIN}`, peta)).toBeNull();
    expect(villageIdDariHost(`a.${SLUG_A}.${BASE_DOMAIN}`, peta)).toBeNull();
  });

  it("menolak domain duplikat lewat indeks unik", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    await expect(
      db
        .insert(villageDomains)
        .values({ villageId: fixture.desaB, domain: DOMAIN_A, isPrimary: false }),
    ).rejects.toThrow();
  });
});
