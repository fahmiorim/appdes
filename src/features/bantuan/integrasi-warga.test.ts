import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  bantuanPeserta,
  bantuanProgram,
  families,
  kelompok,
  kelompokAnggota,
  residents,
  rumahTangga,
  villages,
} from "@/db/schema";
import { listBantuanDiterimaWarga } from "@/features/bantuan/infrastructure/bantuan-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  villageA: number;
  villageB: number;
  residentA: number;
  residentB: number;
  expectedProgramIds: number[];
  expectedOtherResidentProgramId: number;
}

let fixture: Fixture | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

async function seedFixture(): Promise<Fixture> {
  const [villageARow] = await db
    .insert(villages)
    .values({ name: `Desa Bantuan A ${RUN}`, code: `BA${RUN}` })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa Bantuan B ${RUN}`, code: `BB${RUN}` })
    .$returningId();
  const villageA = pastiId(villageARow, "village A");
  const villageB = pastiId(villageBRow, "village B");

  const [familyRow] = await db
    .insert(families)
    .values({ villageId: villageA, number: `31${RUN.padEnd(14, "0")}` })
    .$returningId();
  const [rtmRow] = await db
    .insert(rumahTangga)
    .values({ villageId: villageA, number: `RTM-${RUN}` })
    .$returningId();
  const [groupRow] = await db
    .insert(kelompok)
    .values({
      villageId: villageA,
      name: `Kelompok ${RUN}`,
      slug: `kelompok-${RUN}`,
      type: "kelompok",
    })
    .$returningId();

  const [residentARow] = await db
    .insert(residents)
    .values({
      villageId: villageA,
      name: `Penerima ${RUN}`,
      gender: "female",
      familyId: pastiId(familyRow, "family"),
      rtmId: pastiId(rtmRow, "rtm"),
    })
    .$returningId();
  const [residentBRow] = await db
    .insert(residents)
    .values({ villageId: villageA, name: `Bukan Penerima ${RUN}`, gender: "male" })
    .$returningId();
  const residentA = pastiId(residentARow, "resident A");
  const residentB = pastiId(residentBRow, "resident B");
  const groupId = pastiId(groupRow, "group");

  await db.insert(kelompokAnggota).values({
    villageId: villageA,
    kelompokId: groupId,
    residentId: residentA,
    position: 1,
  });

  const specs = [
    { name: "Bantuan Penduduk", villageId: villageA, sasaran: 1 },
    { name: "Bantuan Keluarga", villageId: villageA, sasaran: 2 },
    { name: "Bantuan RTM", villageId: villageA, sasaran: 3 },
    { name: "Bantuan Kelompok", villageId: villageA, sasaran: 4 },
    { name: "Bantuan Desa Lain", villageId: villageB, sasaran: 1 },
    { name: "Bantuan Warga Lain", villageId: villageA, sasaran: 1 },
  ] as const;
  const programIds: number[] = [];

  for (const [index, spec] of specs.entries()) {
    const [program] = await db
      .insert(bantuanProgram)
      .values({
        villageId: spec.villageId,
        name: `${spec.name} ${RUN}`,
        slug: `${index}-${RUN}`,
        sasaran: spec.sasaran,
        description: `Keterangan ${spec.name}`,
      })
      .$returningId();
    programIds.push(pastiId(program, spec.name));
  }

  await db.insert(bantuanPeserta).values([
    { villageId: villageA, programId: programIds[0]!, residentId: residentA },
    { villageId: villageA, programId: programIds[1]!, familyId: pastiId(familyRow, "family") },
    { villageId: villageA, programId: programIds[2]!, rtmId: pastiId(rtmRow, "rtm") },
    { villageId: villageA, programId: programIds[3]!, kelompokId: groupId },
    // Baris tak konsisten ini memastikan query tidak melintasi tenant meski FK individual valid.
    { villageId: villageB, programId: programIds[4]!, residentId: residentA },
    { villageId: villageA, programId: programIds[5]!, residentId: residentB },
  ]);

  return {
    villageA,
    villageB,
    residentA,
    residentB,
    expectedProgramIds: programIds.slice(0, 4),
    expectedOtherResidentProgramId: programIds[5]!,
  };
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  fixture = await seedFixture();
});

afterAll(async () => {
  if (fixture === null) return;
  const villageIds = [fixture.villageA, fixture.villageB];

  // Composite tenant FKs sengaja RESTRICT penghapusan KK/RTM selama masih ada
  // penduduk yang merujuknya. Bersihkan berurutan sebelum cascade desa.
  await db.delete(residents).where(inArray(residents.villageId, villageIds));
  await db.delete(families).where(inArray(families.villageId, villageIds));
  await db.delete(rumahTangga).where(inArray(rumahTangga.villageId, villageIds));
  await db.delete(villages).where(inArray(villages.id, villageIds));
});

describe("bantuan yang diterima warga (integrasi)", () => {
  it("mengembalikan penerimaan individu, KK, RTM, dan kelompok hanya dari desanya", async () => {
    if (fixture === null) {
      throw new Error("Fixture integrasi tidak siap.");
    }
    const rows = await listBantuanDiterimaWarga(fixture.villageA, fixture.residentA);
    expect(rows.map((row) => row.id).sort((a, b) => a - b)).toEqual(
      [...fixture.expectedProgramIds].sort((a, b) => a - b),
    );
  });

  it("memisahkan bantuan penduduk yang berbeda", async () => {
    if (fixture === null) {
      throw new Error("Fixture integrasi tidak siap.");
    }
    const rows = await listBantuanDiterimaWarga(fixture.villageA, fixture.residentB);
    expect(rows.map((row) => row.id)).toEqual([fixture.expectedOtherResidentProgramId]);
  });
});
