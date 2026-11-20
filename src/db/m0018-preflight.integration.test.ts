import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { analisisIndikator, survey, surveySoal, villages } from "@/db/schema";
import * as schema from "@/db/schema";
import { POLA_NAMA_DATABASE_UJI, validasiDatabaseUji } from "@/testing/db-test-guard";

/**
 * Preflight 0018 harus menolak data lama yang sudah lintas desa sebelum DDL
 * constraint dijalankan. Test ini membuat kondisi kotor setelah constraint baru
 * dilepas, lalu menjalankan isi migration secara langsung.
 *
 * Test memakai database khusus, bukan database integration test bersama. Isi
 * migration sengaja berhenti di tengah setelah melepas constraint; menjalankannya
 * di database bersama akan merusak schema untuk test lain yang berjalan paralel.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const MIGRATION_FILE = fileURLToPath(
  new URL("./migrations/0018_survey_indicator_tenant_fk.sql", import.meta.url),
);
const RUN = String(Date.now()).slice(-7);
let namaDatabase = "";

interface Fixture {
  desaA: number;
  desaB: number;
  surveyA: number;
  soalLintas: number;
  indikatorB: number;
}

let pool: mysql.Pool | null = null;
let database: ReturnType<typeof buatDatabase> | null = null;
let fixture: Fixture | null = null;

function buatDatabase(client: mysql.Pool) {
  return drizzle(client, { schema, mode: "default" });
}

function db(): ReturnType<typeof buatDatabase> {
  if (database === null) throw new Error("Database preflight belum siap.");
  return database;
}

function data(): Fixture {
  if (fixture === null) throw new Error("Fixture preflight belum siap.");
  return fixture;
}

function id(row: { id: number } | undefined, label: string): number {
  if (row === undefined) throw new Error(`Seed gagal: ${label}.`);
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

async function koneksiServer() {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  return mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
}

beforeAll(async () => {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  namaDatabase = `desa_test_preflight_${process.pid}`;
  if (!POLA_NAMA_DATABASE_UJI.test(namaDatabase)) {
    throw new Error("Nama database preflight tidak memenuhi pola database uji.");
  }
  const server = await koneksiServer();
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${namaDatabase}\``);
    await server.query(`CREATE DATABASE \`${namaDatabase}\``);
  } finally {
    await server.end();
  }

  pool = mysql.createPool({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
    database: namaDatabase,
    connectionLimit: 4,
  });
  database = buatDatabase(pool);
  await migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await database
    .insert(villages)
    .values({ name: `Desa Preflight A ${RUN}`, code: `PFA${RUN.slice(-4)}` })
    .$returningId();
  const [desaBRow] = await database
    .insert(villages)
    .values({ name: `Desa Preflight B ${RUN}`, code: `PFB${RUN.slice(-4)}` })
    .$returningId();
  const desaA = id(desaARow, "desa A");
  const desaB = id(desaBRow, "desa B");

  const [indikatorBRow] = await database
    .insert(analisisIndikator)
    .values({ villageId: desaB, kode: `PFB${RUN}`, nama: `Indikator B ${RUN}` })
    .$returningId();
  const indikatorB = id(indikatorBRow, "indikator B");

  const [surveyARow] = await database
    .insert(survey)
    .values({ villageId: desaA, judul: `Survei Preflight A ${RUN}` })
    .$returningId();
  const surveyA = id(surveyARow, "survey A");

  // Lepas constraint baru agar kondisi lama yang tidak valid bisa dibuat.
  await database.execute(
    sql`ALTER TABLE survey_soal DROP FOREIGN KEY survey_soal_indikator_tenant_fk`,
  );

  const [soalRow] = await database
    .insert(surveySoal)
    .values({
      villageId: desaA,
      surveyId: surveyA,
      pertanyaan: `Soal lintas desa ${RUN}`,
      indikatorId: indikatorB,
    })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    surveyA,
    soalLintas: id(soalRow, "soal lintas desa"),
    indikatorB,
  };
});

afterAll(async () => {
  if (pool !== null) {
    await pool.end();
    pool = null;
  }
  database = null;

  const server = await koneksiServer();
  try {
    if (namaDatabase !== "") {
      await server.query(`DROP DATABASE IF EXISTS \`${namaDatabase}\``);
    }
  } finally {
    await server.end();
  }
});

describe("AUD-036 preflight migration 0018", () => {
  it("berhenti dengan duplicate key dan mempertahankan temuan sebelum DDL", async () => {
    const f = data();
    const statements = readFileSync(MIGRATION_FILE, "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    let kegagalan: unknown;
    for (const statement of statements) {
      try {
        await db().execute(sql.raw(statement));
      } catch (error) {
        kegagalan = error;
        break;
      }
    }

    expect(kegagalan).toBeDefined();
    const kode = await kodeGalat(async () => {
      throw kegagalan;
    });
    expect([1062, "ER_DUP_ENTRY"]).toContain(kode);

    const temuan = (await db().execute(sql`
      SELECT jenis, jumlah
      FROM _sitfk_preflight_findings
      WHERE relasi = 'survey_soal.indikator_id'
    `)) as unknown as [Array<{ jenis: string; jumlah: number }>, unknown];

    expect(temuan[0]).toHaveLength(1);
    expect(temuan[0][0]?.jenis).toBe("cross-tenant");
    expect(Number(temuan[0][0]?.jumlah)).toBe(1);

    const [soal] = await db()
      .select({ indikatorId: surveySoal.indikatorId })
      .from(surveySoal)
      .where(eq(surveySoal.id, f.soalLintas))
      .limit(1);
    expect(soal?.indikatorId).toBe(f.indikatorB);
  });
});
