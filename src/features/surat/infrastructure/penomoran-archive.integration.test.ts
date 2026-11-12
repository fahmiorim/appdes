import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { letterClassifications, letters, letterTypes, villages } from "@/db/schema";
import {
  deleteSurat,
  issueSuratRecord,
  listLetterNumberArchive,
  nextSuratSequence,
  nextSuratSequenceByKlasifikasi,
  nextSuratSequenceCombined,
  nextSuratSequenceGlobal,
  suratNumberExists,
  suratNumberExistsWithAgenda,
} from "@/features/surat/infrastructure/surat-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
let fixture: {
  villageId: number;
  typeId: number;
  classificationId: number;
  letterId: number;
} | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [villageRow] = await db
    .insert(villages)
    .values({ name: `Desa Arsip Surat ${RUN}`, code: `AS${RUN}` })
    .$returningId();
  const villageId = pastiId(villageRow, "village");
  const [classificationRow] = await db
    .insert(letterClassifications)
    .values({ villageId, code: `AS${RUN}`, name: `Klasifikasi Uji ${RUN}` })
    .$returningId();
  const classificationId = pastiId(classificationRow, "klasifikasi");
  const [typeRow] = await db
    .insert(letterTypes)
    .values({
      villageId,
      code: `AS${RUN}`,
      name: `Jenis Uji ${RUN}`,
      classificationId,
      templateBody: "Isi surat uji",
      requiresResident: false,
    })
    .$returningId();
  const typeId = pastiId(typeRow, "jenis surat");
  const [letterRow] = await db
    .insert(letters)
    .values({
      villageId,
      typeId,
      typeName: `Jenis Uji ${RUN}`,
      letterDate: "2025-05-06",
      year: 2025,
    })
    .$returningId();
  fixture = {
    villageId,
    typeId,
    classificationId,
    letterId: pastiId(letterRow, "surat"),
  };
});

afterAll(async () => {
  if (fixture) await db.delete(villages).where(eq(villages.id, fixture.villageId));
});

describe("arsip nomor surat", () => {
  it("tidak memakai ulang nomor terbit setelah surat sumber dihapus", async () => {
    if (!fixture) {
      throw new Error("Fixture integrasi tidak siap.");
    }

    await issueSuratRecord(fixture.villageId, fixture.letterId, {
      number: `AS/${RUN}/2025`,
      sequence: 8,
      year: 2025,
      typeId: fixture.typeId,
      classificationId: fixture.classificationId,
      typeName: `Jenis Uji ${RUN}`,
      content: "Isi surat terbit",
      issuedAt: new Date("2025-05-06T00:00:00Z"),
    });
    await deleteSurat(fixture.villageId, fixture.letterId);

    await expect(nextSuratSequence(fixture.villageId, fixture.typeId, 2025)).resolves.toBe(9);
    await expect(nextSuratSequenceGlobal(fixture.villageId, 2025)).resolves.toBe(9);
    await expect(
      nextSuratSequenceByKlasifikasi(fixture.villageId, fixture.classificationId, 2025),
    ).resolves.toBe(9);
    await expect(nextSuratSequenceCombined(fixture.villageId, 2025)).resolves.toBe(9);
    await expect(suratNumberExists(fixture.villageId, `AS/${RUN}/2025`)).resolves.toBe(true);
    await expect(suratNumberExistsWithAgenda(fixture.villageId, `AS/${RUN}/2025`)).resolves.toBe(
      true,
    );
    await expect(
      listLetterNumberArchive(fixture.villageId, { q: `AS/${RUN}`, year: 2025 }),
    ).resolves.toMatchObject({
      rows: [
        {
          number: `AS/${RUN}/2025`,
          sequence: 8,
          year: 2025,
          classificationId: fixture.classificationId,
          typeName: `Jenis Uji ${RUN}`,
          letterId: null,
        },
      ],
      total: 1,
    });
  });
});
