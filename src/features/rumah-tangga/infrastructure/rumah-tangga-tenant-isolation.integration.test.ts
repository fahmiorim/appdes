import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { regions, residents, rumahTangga, villages } from "@/db/schema";
import {
  deleteRumahTangga,
  findRumahTanggaById,
  listRumahTangga,
  listRumahTanggaMembers,
  listRtmRingkas,
  setAnggotaRumahTangga,
  updateRumahTangga,
} from "@/features/rumah-tangga/infrastructure/rumah-tangga-repository";
import { filterRtmKosong, type RumahTanggaFormInput } from "@/features/rumah-tangga/domain/rumah-tangga";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  villageA: number;
  villageB: number;
  rtmA: number;
  rtmB: number;
  residentB: number;
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
    .values({ name: `Desa RTM A ${RUN}`, code: `RTA${RUN}` })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa RTM B ${RUN}`, code: `RTB${RUN}` })
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

  const [rtmARow] = await db
    .insert(rumahTangga)
    .values({ villageId: villageA, number: `RTMA-${RUN}`, regionId: regionA })
    .$returningId();
  const [rtmBRow] = await db
    .insert(rumahTangga)
    .values({ villageId: villageB, number: `RTMB-${RUN}`, regionId: regionB })
    .$returningId();
  const rtmA = pastiId(rtmARow, "RTM A");
  const rtmB = pastiId(rtmBRow, "RTM B");

  await db.insert(residents).values({
    villageId: villageA,
    rtmId: rtmA,
    rtmLevel: 1,
    name: `Kepala RTM A ${RUN}`,
    gender: "male",
    birthDate: "1980-01-01",
  });

  const [residentBRow] = await db
    .insert(residents)
    .values({
      villageId: villageB,
      rtmId: rtmB,
      rtmLevel: 1,
      name: `Kepala RTM B ${RUN}`,
      gender: "female",
      birthDate: "1985-01-01",
    })
    .$returningId();
  const residentB = pastiId(residentBRow, "resident B");

  await sisipkanLegacy(
    "INSERT INTO residents (village_id, rtm_id, rtm_level, name, gender, birth_date) VALUES (?, ?, 2, ?, 'female', '1990-01-01')",
    [villageB, rtmA, `Anggota Legacy B ${RUN}`],
  );
  await sisipkanLegacy(
    "UPDATE rumah_tangga SET region_id = ? WHERE id = ?",
    [regionB, rtmA],
  );

  return { villageA, villageB, rtmA, rtmB, residentB };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  fixture = await seedFixture();
});

afterAll(async () => {
  if (!fixture) return;
  const villageIds = [fixture.villageA, fixture.villageB];
  await db.delete(residents).where(inArray(residents.villageId, villageIds));
  await db.delete(rumahTangga).where(inArray(rumahTangga.villageId, villageIds));
  await db.delete(regions).where(inArray(regions.villageId, villageIds));
  await db.delete(villages).where(inArray(villages.id, villageIds));
});

describe("isolasi tenant repository rumah tangga", () => {
  it("tidak menampilkan anggota atau wilayah dari desa lain pada daftar dan laporan", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    const daftar = await listRumahTangga({
      villageId: current.villageA,
      filter: filterRtmKosong(),
      page: 1,
      pageSize: 20,
    });
    expect(daftar.rows).toHaveLength(1);
    expect(daftar.rows[0]?.memberCount).toBe(1);
    expect(daftar.rows[0]?.regionLabel).toBeNull();

    const anggota = await listRumahTanggaMembers(current.villageA, current.rtmA);
    expect(anggota).toHaveLength(1);
    expect(anggota.some((row) => row.name.includes("Legacy B"))).toBe(false);

    const laporan = await listRtmRingkas(current.villageA, filterRtmKosong());
    expect(laporan).toHaveLength(1);
    expect(laporan[0]?.dusun).toBeNull();
    expect(laporan[0]?.anggota).toBe(1);
  });

  it("membatasi update, delete, dan penetapan anggota berdasarkan desa", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const current = fixture;

    const before = await findRumahTanggaById(current.villageA, current.rtmA);
    expect(before).not.toBeNull();
    const input: RumahTanggaFormInput = {
      alamat: "Tidak boleh diubah",
      regionId: null,
      kelasSosial: null,
      bdt: "",
    };

    await updateRumahTangga(current.villageB, current.rtmA, input);
    await deleteRumahTangga(current.villageB, current.rtmA);
    await expect(
      setAnggotaRumahTangga(current.villageA, current.residentB, current.rtmB, 2),
    ).rejects.toThrow(/tidak ditemukan pada desa aktif/);

    const after = await findRumahTanggaById(current.villageA, current.rtmA);
    expect(after?.address).toBe(before?.address);
    const [resident] = await db
      .select({ rtmId: residents.rtmId })
      .from(residents)
      .where(eq(residents.id, current.residentB))
      .limit(1);
    expect(resident?.rtmId).toBe(current.rtmB);
  });
});
