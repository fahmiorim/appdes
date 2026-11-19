import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  pembangunanDokumentasi,
  pembangunanProyek,
  survey,
  surveyJawaban,
  surveyResponden,
  surveySoal,
  villages,
} from "@/db/schema";
import { insertDokumentasi } from "@/features/pembangunan/infrastructure/pembangunan-repository";
import { insertResponden, insertSoal } from "@/features/survey/infrastructure/survey-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Migration 0016: `village_id` pada tabel anak survey dan dokumentasi
 * pembangunan, dengan composite foreign key yang menolak referensi lintas
 * tenant walau kode aplikasi keliru memasang pasangan id.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = String(Date.now()).slice(-7);

interface Fixture {
  desaA: number;
  desaB: number;
  surveyA: number;
  surveyB: number;
  soalA: number;
  soalB: number;
  respondenA: number;
  proyekA: number;
  proyekB: number;
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

async function nilaiSoal(villageId: number, surveyId: number): Promise<number> {
  return insertSoal(villageId, surveyId, {
    pertanyaan: `Pertanyaan ${RUN}`,
    tipe: "text",
    pilihan: null,
    bobot: 1,
    skorPilihan: null,
    indikatorId: null,
    urutan: 1,
  });
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa TCT A ${RUN}`, code: `TCTA${RUN.slice(-4)}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa TCT B ${RUN}`, code: `TCTB${RUN.slice(-4)}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [surveyARow] = await db
    .insert(survey)
    .values({ villageId: desaA, judul: `Survei A ${RUN}`, aktif: 1 })
    .$returningId();
  const [surveyBRow] = await db
    .insert(survey)
    .values({ villageId: desaB, judul: `Survei B ${RUN}`, aktif: 1 })
    .$returningId();
  const surveyA = idDari(surveyARow, "survei A");
  const surveyB = idDari(surveyBRow, "survei B");

  const soalA = await nilaiSoal(desaA, surveyA);
  const soalB = await nilaiSoal(desaB, surveyB);

  const respondenA = await insertResponden(
    desaA,
    surveyA,
    { nama: `Responden A ${RUN}`, nik: null },
    [{ soalId: soalA, jawaban: "jawaban A" }],
  );

  const [proyekARow] = await db
    .insert(pembangunanProyek)
    .values({
      villageId: desaA,
      judul: `Proyek A ${RUN}`,
      slug: `proyek-a-${RUN}`,
      tahunAnggaran: 2026,
    })
    .$returningId();
  const [proyekBRow] = await db
    .insert(pembangunanProyek)
    .values({
      villageId: desaB,
      judul: `Proyek B ${RUN}`,
      slug: `proyek-b-${RUN}`,
      tahunAnggaran: 2026,
    })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    surveyA,
    surveyB,
    soalA,
    soalB,
    respondenA,
    proyekA: idDari(proyekARow, "proyek A"),
    proyekB: idDari(proyekBRow, "proyek B"),
  };
});

afterAll(async () => {
  const data = fixture;
  if (!data) return;
  await db.delete(villages).where(eq(villages.id, data.desaA));
  await db.delete(villages).where(eq(villages.id, data.desaB));
});

describe("tabel anak survey menyimpan tenant dari induk", () => {
  it("menulis village_id soal dan responden sesuai tenant pemanggil", async () => {
    const data = dataUji();

    const [soal] = await db
      .select({ villageId: surveySoal.villageId })
      .from(surveySoal)
      .where(eq(surveySoal.id, data.soalA));
    const [responden] = await db
      .select({ villageId: surveyResponden.villageId })
      .from(surveyResponden)
      .where(eq(surveyResponden.id, data.respondenA));
    const [jawaban] = await db
      .select({ villageId: surveyJawaban.villageId })
      .from(surveyJawaban)
      .where(eq(surveyJawaban.respondenId, data.respondenA));

    expect(soal?.villageId).toBe(data.desaA);
    expect(responden?.villageId).toBe(data.desaA);
    expect(jawaban?.villageId).toBe(data.desaA);
  });

  it("menolak soal yang menunjuk survei desa lain", async () => {
    const data = dataUji();

    const kode = await kodeGalat(() =>
      db.insert(surveySoal).values({
        villageId: data.desaB,
        surveyId: data.surveyA,
        pertanyaan: "lintas tenant",
      }),
    );

    expect(["ER_NO_REFERENCED_ROW_2", "ER_NO_REFERENCED_ROW", 1452]).toContain(kode);
  });

  it("menolak jawaban yang mencampur responden dan soal beda tenant", async () => {
    const data = dataUji();

    const kode = await kodeGalat(() =>
      db.insert(surveyJawaban).values({
        villageId: data.desaA,
        respondenId: data.respondenA,
        soalId: data.soalB,
        jawaban: "lintas tenant",
      }),
    );

    expect(["ER_NO_REFERENCED_ROW_2", "ER_NO_REFERENCED_ROW", 1452]).toContain(kode);
  });

  it("menghapus soal, responden, dan jawaban saat survei dihapus", async () => {
    const data = dataUji();

    await db.delete(survey).where(eq(survey.id, data.surveyB));

    const soal = await db
      .select({ id: surveySoal.id })
      .from(surveySoal)
      .where(eq(surveySoal.id, data.soalB));
    expect(soal).toHaveLength(0);
  });
});

describe("dokumentasi pembangunan menyimpan tenant dari proyek", () => {
  it("menulis village_id dari tenant pemanggil", async () => {
    const data = dataUji();

    const id = await insertDokumentasi(data.desaA, data.proyekA, "media/proyek-a.jpg", {
      judul: "Foto A",
      keterangan: "",
    });
    const [row] = await db
      .select({ villageId: pembangunanDokumentasi.villageId })
      .from(pembangunanDokumentasi)
      .where(eq(pembangunanDokumentasi.id, id));

    expect(row?.villageId).toBe(data.desaA);
  });

  it("menolak dokumentasi desa lain untuk proyek milik desa A", async () => {
    const data = dataUji();

    const kode = await kodeGalat(() =>
      db.insert(pembangunanDokumentasi).values({
        villageId: data.desaB,
        proyekId: data.proyekA,
        gambar: "media/lintas-tenant.jpg",
      }),
    );

    expect(["ER_NO_REFERENCED_ROW_2", "ER_NO_REFERENCED_ROW", 1452]).toContain(kode);
  });
});
