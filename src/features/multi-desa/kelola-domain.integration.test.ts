import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { accounts, users, villageDomains, villages } from "@/db/schema";
import {
  hapusDomainDesa,
  jadikanDomainUtama,
  listSemuaDomain,
  tambahDomainDesa,
} from "@/features/multi-desa/infrastructure/kelola-desa-repository";
import { provisionDesa } from "@/features/multi-desa/infrastructure/provisioning-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Pengelolaan domain/alias tenant yang dipakai konsol Super Admin.
 *
 * Yang dibuktikan: domain pertama menjadi utama dan dicerminkan ke
 * `villages.domain`, domain berikutnya menjadi alias, penggantian domain utama,
 * penghapusan alias, dan penolakan domain yang sudah dipakai tenant lain
 * (termasuk ID domain milik desa lain).
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

let desaA: number | null = null;
let desaB: number | null = null;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const a = await provisionDesa({
    name: `Desa Domain A ${RUN}`,
    code: `7${String(Date.now()).slice(-9)}`,
    domain: `domain-a-${RUN}.test`,
    adminName: "Admin A",
    adminUsername: `admin-a-${RUN}`,
    adminEmail: `admin-a-${RUN}@contoh.id`,
    adminPassword: "sandi-uji-panjang-2026",
    kuotaMediaMb: null,
  });
  const b = await provisionDesa({
    name: `Desa Domain B ${RUN}`,
    code: `8${String(Date.now() + 1).slice(-9)}`,
    domain: `domain-b-${RUN}.test`,
    adminName: "Admin B",
    adminUsername: `admin-b-${RUN}`,
    adminEmail: `admin-b-${RUN}@contoh.id`,
    adminPassword: "sandi-uji-panjang-2026",
    kuotaMediaMb: null,
  });

  desaA = a.id;
  desaB = b.id;
});

afterAll(async () => {
  const ids = [desaA, desaB].filter((id): id is number => id !== null);
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

  await db.delete(villageDomains).where(inArray(villageDomains.villageId, ids));
  await db.delete(villages).where(inArray(villages.id, ids));
});

describe("pengelolaan domain tenant", () => {
  it("mencerminkan domain utama ke villages.domain", async () => {
    if (desaA === null) throw new Error("Fixture desa A tidak siap.");

    const [domainUtama] = await db
      .select({ domain: villageDomains.domain, isPrimary: villageDomains.isPrimary })
      .from(villageDomains)
      .where(eq(villageDomains.villageId, desaA));
    expect(domainUtama).toEqual({ domain: `domain-a-${RUN}.test`, isPrimary: true });

    const [desa] = await db
      .select({ domain: villages.domain })
      .from(villages)
      .where(eq(villages.id, desaA));
    expect(desa?.domain).toBe(`domain-a-${RUN}.test`);
  });

  it("menambah alias tanpa mengubah domain utama", async () => {
    if (desaA === null) throw new Error("Fixture desa A tidak siap.");

    const alias = await tambahDomainDesa(desaA, `alias-a-${RUN}.test`);

    const daftar = (await listSemuaDomain()).filter((item) => item.villageId === desaA);
    expect(daftar).toHaveLength(2);
    expect(daftar.find((item) => item.id === alias.id)).toMatchObject({
      domain: `alias-a-${RUN}.test`,
      isPrimary: false,
    });
  });

  it("menolak alias non-utama dihapus sebelum ada domain utama pengganti", async () => {
    if (desaA === null) throw new Error("Fixture desa A tidak siap.");

    const [utama] = await db
      .select({ id: villageDomains.id })
      .from(villageDomains)
      .where(eq(villageDomains.villageId, desaA));

    await expect(hapusDomainDesa(desaA, utama?.id ?? 0)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("memindahkan domain utama ke alias dan memperbarui villages.domain", async () => {
    if (desaA === null) throw new Error("Fixture desa A tidak siap.");

    const [alias] = await db
      .select({ id: villageDomains.id })
      .from(villageDomains)
      .where(eq(villageDomains.domain, `alias-a-${RUN}.test`));

    await jadikanDomainUtama(desaA, alias?.id ?? 0);

    const daftar = (await listSemuaDomain()).filter((item) => item.villageId === desaA);
    expect(daftar.filter((item) => item.isPrimary)).toEqual([
      expect.objectContaining({ domain: `alias-a-${RUN}.test` }),
    ]);
    const [desa] = await db
      .select({ domain: villages.domain })
      .from(villages)
      .where(eq(villages.id, desaA));
    expect(desa?.domain).toBe(`alias-a-${RUN}.test`);
  });

  it("menghapus alias lama setelah bukan domain utama lagi", async () => {
    if (desaA === null) throw new Error("Fixture desa A tidak siap.");

    const [lama] = await db
      .select({ id: villageDomains.id })
      .from(villageDomains)
      .where(eq(villageDomains.domain, `domain-a-${RUN}.test`));

    await hapusDomainDesa(desaA, lama?.id ?? 0);

    const daftar = (await listSemuaDomain()).filter((item) => item.villageId === desaA);
    expect(daftar.map((item) => item.domain)).toEqual([`alias-a-${RUN}.test`]);
  });

  it("menolak domain yang sudah dipakai tenant lain", async () => {
    if (desaB === null) throw new Error("Fixture desa B tidak siap.");

    await expect(tambahDomainDesa(desaB, `alias-a-${RUN}.test`)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("menolak ID domain milik desa lain", async () => {
    if (desaA === null || desaB === null) throw new Error("Fixture desa tidak siap.");

    const [milikA] = await db
      .select({ id: villageDomains.id })
      .from(villageDomains)
      .where(eq(villageDomains.villageId, desaA));

    await expect(jadikanDomainUtama(desaB, milikA?.id ?? 0)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(hapusDomainDesa(desaB, milikA?.id ?? 0)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
