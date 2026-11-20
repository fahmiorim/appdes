import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { analisisIndikator, survey, surveySoal, villages } from "@/db/schema";
import { deleteAnalisisIndikator } from "@/features/analisis/infrastructure/analisis-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Migration 0018: `survey_soal.indikator_id` wajib menunjuk indikator dari
 * desa yang sama. Repository juga harus melepas referensi soal sebelum
 * indikator dihapus karena composite FK memakai RESTRICT.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = String(Date.now()).slice(-7);

interface Fixture {
  desaA: number;
  desaB: number;
  surveyA: number;
  soalA: number;
  indikatorA: number;
  indikatorB: number;
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

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa SITFK A ${RUN}`, code: `SIA${RUN.slice(-4)}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa SITFK B ${RUN}`, code: `SIB${RUN.slice(-4)}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [indikatorARow] = await db
    .insert(analisisIndikator)
    .values({ villageId: desaA, kode: `IA${RUN}`, nama: `Indikator A ${RUN}` })
    .$returningId();
  const [indikatorBRow] = await db
    .insert(analisisIndikator)
    .values({ villageId: desaB, kode: `IB${RUN}`, nama: `Indikator B ${RUN}` })
    .$returningId();
  const indikatorA = idDari(indikatorARow, "indikator A");
  const indikatorB = idDari(indikatorBRow, "indikator B");

  const [surveyARow] = await db
    .insert(survey)
    .values({ villageId: desaA, judul: `Survei A ${RUN}`, aktif: 1 })
    .$returningId();
  const surveyA = idDari(surveyARow, "survey A");

  const [soalARow] = await db
    .insert(surveySoal)
    .values({
      villageId: desaA,
      surveyId: surveyA,
      pertanyaan: `Pertanyaan A ${RUN}`,
      indikatorId: indikatorA,
    })
    .$returningId();
  const soalA = idDari(soalARow, "soal A");

  fixture = { desaA, desaB, surveyA, soalA, indikatorA, indikatorB };
});

afterAll(async () => {
  if (fixture === null) return;
  await db.delete(survey).where(inArray(survey.id, [fixture.surveyA]));
  await db
    .delete(analisisIndikator)
    .where(inArray(analisisIndikator.id, [fixture.indikatorA, fixture.indikatorB]));
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("AUD-036 composite FK indikator survey", () => {
  it("menerima indikator dari desa yang sama", async () => {
    const current = dataUji();
    const [row] = await db
      .select({ indikatorId: surveySoal.indikatorId })
      .from(surveySoal)
      .where(eq(surveySoal.id, current.soalA))
      .limit(1);

    expect(row?.indikatorId).toBe(current.indikatorA);
  });

  it("menolak soal yang menunjuk indikator desa lain", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.insert(surveySoal).values({
        villageId: current.desaA,
        surveyId: current.surveyA,
        pertanyaan: `Soal lintas tenant ${RUN}`,
        indikatorId: current.indikatorB,
      }),
    );

    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(code);
  });

  it("menolak delete indikator yang masih dipakai soal", async () => {
    const current = dataUji();
    const code = await kodeGalat(() =>
      db.delete(analisisIndikator).where(eq(analisisIndikator.id, current.indikatorA)),
    );

    expect([1451, "ER_ROW_IS_REFERENCED_2"]).toContain(code);
  });

  it("melepas soal sewilayah sebelum menghapus indikator", async () => {
    const current = dataUji();

    await deleteAnalisisIndikator(current.indikatorA, current.desaA);

    const [soal] = await db
      .select({ indikatorId: surveySoal.indikatorId })
      .from(surveySoal)
      .where(eq(surveySoal.id, current.soalA))
      .limit(1);
    const [indikator] = await db
      .select({ id: analisisIndikator.id })
      .from(analisisIndikator)
      .where(eq(analisisIndikator.id, current.indikatorA))
      .limit(1);

    expect(soal?.indikatorId).toBeNull();
    expect(indikator).toBeUndefined();
  });
});
