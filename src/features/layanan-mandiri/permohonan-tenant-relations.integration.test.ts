import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { letterTypes, letters, residents, villages } from "@/db/schema";
import {
  buatPermohonan,
  findPendudukById,
  tautkanSuratPermohonan,
} from "@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  villageA: number;
  villageB: number;
  residentA: number;
  residentB: number;
  letterTypeA: number;
  letterTypeB: number;
  letterB: number;
  requestA: number;
}

let fixture: Fixture | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

async function seed(): Promise<Fixture> {
  const [villageARow] = await db
    .insert(villages)
    .values({ name: `Desa Permohonan A ${RUN}`, code: `PMA${RUN}`.slice(0, 10) })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa Permohonan B ${RUN}`, code: `PMB${RUN}`.slice(0, 10) })
    .$returningId();
  const villageA = pastiId(villageARow, "village A");
  const villageB = pastiId(villageBRow, "village B");

  const [residentARow] = await db
    .insert(residents)
    .values({ villageId: villageA, name: `Penduduk A ${RUN}`, gender: "male" })
    .$returningId();
  const [residentBRow] = await db
    .insert(residents)
    .values({ villageId: villageB, name: `Penduduk B ${RUN}`, gender: "female" })
    .$returningId();

  const [typeARow] = await db
    .insert(letterTypes)
    .values({
      villageId: villageA,
      code: `PA${RUN}`.slice(0, 20),
      name: `Jenis Surat A ${RUN}`,
      templateBody: "<p>Uji A</p>",
    })
    .$returningId();
  const [typeBRow] = await db
    .insert(letterTypes)
    .values({
      villageId: villageB,
      code: `PB${RUN}`.slice(0, 20),
      name: `Jenis Surat B ${RUN}`,
      templateBody: "<p>Uji B</p>",
    })
    .$returningId();

  const residentA = pastiId(residentARow, "resident A");
  const residentB = pastiId(residentBRow, "resident B");
  const letterTypeA = pastiId(typeARow, "letter type A");
  const letterTypeB = pastiId(typeBRow, "letter type B");

  const [letterBRow] = await db
    .insert(letters)
    .values({
      villageId: villageB,
      typeId: letterTypeB,
      typeName: `Jenis Surat B ${RUN}`,
      letterDate: "2026-11-13",
      year: 2026,
    })
    .$returningId();
  const letterB = pastiId(letterBRow, "letter B");

  const requestA = await buatPermohonan({
    villageId: villageA,
    residentId: residentA,
    letterTypeId: letterTypeA,
  });
  if (requestA === undefined) throw new Error("Seed uji gagal: request A");

  return {
    villageA,
    villageB,
    residentA,
    residentB,
    letterTypeA,
    letterTypeB,
    letterB,
    requestA,
  };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  fixture = await seed();
});

afterAll(async () => {
  if (!fixture) return;
  // Surat desa B menjadi child dari jenis surat B dengan FK RESTRICT.
  await db.delete(letters).where(eq(letters.id, fixture.letterB));
  await db.delete(villages).where(inArray(villages.id, [fixture.villageA, fixture.villageB]));
});

function dataUji(): Fixture {
  if (!fixture) throw new Error("Fixture integrasi tidak siap.");
  return fixture;
}

describe("AUD-006 tenant ownership relasi permohonan surat", () => {
  it("mencari penduduk hanya pada tenant yang diminta", async () => {
    const f = dataUji();
    expect(await findPendudukById(f.villageA, f.residentA)).not.toBeNull();
    expect(await findPendudukById(f.villageA, f.residentB)).toBeNull();
    expect(await findPendudukById(f.villageB, f.residentA)).toBeNull();
  });

  it("menolak membuat permohonan dengan penduduk dari desa lain", async () => {
    const f = dataUji();
    await expect(
      buatPermohonan({
        villageId: f.villageA,
        residentId: f.residentB,
        letterTypeId: f.letterTypeA,
      }),
    ).rejects.toThrow("Penduduk tidak ditemukan pada desa ini.");
  });

  it("menolak membuat permohonan dengan jenis surat dari desa lain", async () => {
    const f = dataUji();
    await expect(
      buatPermohonan({
        villageId: f.villageA,
        residentId: f.residentA,
        letterTypeId: f.letterTypeB,
      }),
    ).rejects.toThrow("Jenis surat tidak ditemukan atau sedang tidak aktif.");
  });

  it("menolak menautkan surat dinas milik desa lain ke permohonan", async () => {
    const f = dataUji();
    await expect(
      tautkanSuratPermohonan(f.villageA, f.requestA, f.letterB),
    ).rejects.toThrow("Surat dinas tidak ditemukan pada desa ini.");
  });
});
