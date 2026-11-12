import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { regions, residents, villages } from "@/db/schema";
import { bantuanPeserta, bantuanProgram } from "@/db/schema/bantuan";
import {
  getStatistikBantuan,
  getStatistikPenduduk,
} from "@/features/statistik/infrastructure/statistik-repository";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  villageA: number;
  villageB: number;
  foreignRegionName: string;
  programA: number;
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
    .values({ name: `Desa Statistik A ${RUN}`, code: `STA${RUN}` })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa Statistik B ${RUN}`, code: `STB${RUN}` })
    .$returningId();
  const villageA = pastiId(villageARow, "village A");
  const villageB = pastiId(villageBRow, "village B");

  const [regionARow] = await db
    .insert(regions)
    .values({ villageId: villageA, dusun: `Dusun A ${RUN}` })
    .$returningId();
  const [regionBRow] = await db
    .insert(regions)
    .values({ villageId: villageB, dusun: `Dusun Rahasia B ${RUN}` })
    .$returningId();
  const regionA = pastiId(regionARow, "region A");
  const regionB = pastiId(regionBRow, "region B");
  const foreignRegionName = `Dusun Rahasia B ${RUN}`;

  await db.insert(residents).values({
    villageId: villageA,
    regionId: regionA,
    name: `Penduduk A ${RUN}`,
    gender: "male",
    lifeStatus: "alive",
    birthDate: "1980-01-01",
  });
  const [residentBRow] = await db
    .insert(residents)
    .values({
      villageId: villageB,
      regionId: regionB,
      name: `Penduduk B ${RUN}`,
      gender: "male",
      lifeStatus: "alive",
      birthDate: "1985-01-01",
    })
    .$returningId();
  const residentB = pastiId(residentBRow, "resident B");

  // Penduduk desa A dengan region legacy milik desa B.
  await sisipkanLegacy(
    "INSERT INTO residents (village_id, region_id, name, gender, life_status, birth_date) VALUES (?, ?, ?, 'female', 'alive', '1990-01-01')",
    [villageA, regionB, `Penduduk Legacy A ${RUN}`],
  );

  const [programRow] = await db
    .insert(bantuanProgram)
    .values({
      villageId: villageA,
      name: `Program Statistik ${RUN}`,
      slug: `program-statistik-${RUN}`,
      sasaran: 1,
    })
    .$returningId();
  const programA = pastiId(programRow, "program A");

  // Peserta desa A yang menunjuk penduduk desa B (relasi legacy tidak konsisten).
  await db.insert(bantuanPeserta).values({
    villageId: villageA,
    programId: programA,
    residentId: residentB,
  });

  return { villageA, villageB, foreignRegionName, programA };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  fixture = await seedFixture();
});

afterAll(async () => {
  if (!fixture) return;
  const villageIds = [fixture.villageA, fixture.villageB];
  await db.delete(bantuanPeserta).where(inArray(bantuanPeserta.villageId, villageIds));
  await db.delete(bantuanProgram).where(inArray(bantuanProgram.villageId, villageIds));
  await db.delete(residents).where(inArray(residents.villageId, villageIds));
  await db.delete(regions).where(inArray(regions.villageId, villageIds));
  await db.delete(villages).where(inArray(villages.id, villageIds));
});

describe("isolasi tenant repository statistik", () => {
  it("tidak memakai wilayah desa lain untuk filter atau label statistik penduduk", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    const statistik = await getStatistikPenduduk(current.villageA, {
      kind: "gender",
      dusun: current.foreignRegionName,
      page: 1,
      perPage: 20,
    });
    expect(statistik.summary.total).toBe(0);
    expect(statistik.summary.male).toBe(0);
    expect(statistik.summary.female).toBe(0);
  });

  it("tidak membaca gender dan wilayah penduduk lintas desa pada statistik bantuan", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    const semua = await getStatistikBantuan(current.villageA, {
      kind: "program",
      page: 1,
      perPage: 20,
    });
    expect(semua.summary.total).toBe(1);
    expect(semua.summary.male).toBe(0);
    expect(semua.summary.female).toBe(0);

    const filterAsing = await getStatistikBantuan(current.villageA, {
      kind: "program",
      dusun: current.foreignRegionName,
      page: 1,
      perPage: 20,
    });
    expect(filterAsing.summary.total).toBe(0);
  });
});
