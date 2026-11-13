import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { families, regions, residents, villages } from "@/db/schema";
import {
  HEAD_OF_FAMILY_RELATION_ID,
  type KeluargaFormInput,
} from "@/features/keluarga/domain/keluarga";
import {
  deleteKeluarga,
  findKeluargaById,
  findKeluargaDetail,
  listKeluarga,
  listKeluargaAnggotaRows,
  listKeluargaMemberDetails,
  listKeluargaMembers,
  updateKeluarga,
  validateKeluargaRegion,
} from "@/features/keluarga/infrastructure/keluarga-repository";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  villageA: number;
  villageB: number;
  regionA: number;
  regionB: number;
  familyA: number;
  familyB: number;
  foreignResidentName: string;
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
    .values({ name: `Desa Keluarga A ${RUN}`, code: `KLA${RUN}`.slice(0, 10) })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa Keluarga B ${RUN}`, code: `KLB${RUN}`.slice(0, 10) })
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

  const [familyARow] = await db
    .insert(families)
    .values({ villageId: villageA, number: `KKA-${RUN}`, regionId: regionA })
    .$returningId();
  const [familyBRow] = await db
    .insert(families)
    .values({ villageId: villageB, number: `KKB-${RUN}`, regionId: regionB })
    .$returningId();
  const familyA = pastiId(familyARow, "family A");
  const familyB = pastiId(familyBRow, "family B");

  await sisipkanLegacy(
    "INSERT INTO residents (village_id, family_id, family_relation_id, name, gender, birth_date) VALUES (?, ?, ?, ?, 'male', '1980-01-01')",
    [villageA, familyA, HEAD_OF_FAMILY_RELATION_ID, `Kepala Keluarga A ${RUN}`],
  );

  const foreignResidentName = `Identitas Rahasia Desa B ${RUN}`;
  await sisipkanLegacy(
    "INSERT INTO residents (village_id, family_id, family_relation_id, name, gender, birth_date) VALUES (?, ?, ?, ?, 'female', '1990-01-01')",
    [villageB, familyA, HEAD_OF_FAMILY_RELATION_ID, foreignResidentName],
  );
  await sisipkanLegacy("UPDATE families SET region_id = ? WHERE id = ?", [regionB, familyA]);

  return { villageA, villageB, regionA, regionB, familyA, familyB, foreignResidentName };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  fixture = await seedFixture();
});

afterAll(async () => {
  if (!fixture) return;
  const villageIds = [fixture.villageA, fixture.villageB];
  await db.delete(residents).where(inArray(residents.villageId, villageIds));
  await db.delete(families).where(inArray(families.villageId, villageIds));
  await db.delete(regions).where(inArray(regions.villageId, villageIds));
  await db.delete(villages).where(inArray(villages.id, villageIds));
});

describe("isolasi tenant repository keluarga", () => {
  it("tidak menampilkan kepala keluarga, anggota, jumlah, atau wilayah dari desa lain", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    const daftar = await listKeluarga({
      villageId: current.villageA,
      search: "",
      page: 1,
      pageSize: 20,
    });
    expect(daftar.rows).toHaveLength(1);
    expect(daftar.rows[0]?.headName).toContain("Kepala Keluarga A");
    expect(daftar.rows[0]?.headName).not.toContain("Rahasia Desa B");
    expect(daftar.rows[0]?.memberCount).toBe(1);
    expect(daftar.rows[0]?.regionLabel).toBe("Wilayah tanpa nama");

    const anggota = await listKeluargaMembers(current.villageA, current.familyA);
    expect(anggota).toHaveLength(1);
    expect(anggota.some((row) => row.name === current.foreignResidentName)).toBe(false);

    const detailAnggota = await listKeluargaMemberDetails(current.villageA, current.familyA);
    expect(detailAnggota).toHaveLength(1);
    expect(detailAnggota.some((row) => row.name === current.foreignResidentName)).toBe(false);

    const barisAnggota = await listKeluargaAnggotaRows(current.villageA, current.familyA);
    expect(barisAnggota).toHaveLength(1);
    expect(barisAnggota.some((row) => row.name === current.foreignResidentName)).toBe(false);

    const detail = await findKeluargaDetail(current.villageA, current.familyA);
    expect(detail?.regionLabel).toBe("Wilayah tanpa nama");
  });

  it("membatasi update dan delete KK berdasarkan desa pada repository", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    const before = await findKeluargaById(current.villageA, current.familyA);
    expect(before).not.toBeNull();
    const input: KeluargaFormInput = {
      number: `JANGAN-${RUN}`,
      address: "",
      regionId: null,
    };

    await updateKeluarga(current.villageB, current.familyA, input);
    await deleteKeluarga(current.villageB, current.familyA);

    const after = await findKeluargaById(current.villageA, current.familyA);
    expect(after?.number).toBe(before?.number);
  });

  it("menolak wilayah milik desa lain dan menerima wilayah sendiri", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    await expect(validateKeluargaRegion(current.villageA, current.regionB)).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(
      validateKeluargaRegion(current.villageA, current.regionA),
    ).resolves.toBeUndefined();
    await expect(validateKeluargaRegion(current.villageA, null)).resolves.toBeUndefined();
  });
});
