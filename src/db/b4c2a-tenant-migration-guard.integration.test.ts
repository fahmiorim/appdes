import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { validasiDatabaseUji, validasiDsnUji } from "@/testing/db-test-guard";

/** AUD-034 B4C-2a: verify 0009 aborts before replacing constraints on legacy data. */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();
const DATABASE = `desa_test_aud034b4c2ag_${RUN}`;

const RELASI = [
  "incoming_letters.classification_id",
  "letter_dinas.classification_id",
  "letter_types.classification_id",
  "outgoing_letters.classification_id",
] as const;

let pool: Pool | null = null;
let galatMigrasi: unknown = null;
let temuan: Array<{ relasi: string; jenis: string; jumlah: number }> = [];
let fk: string[] = [];
let indexParent: Array<{ tabel: string; nama: string }> = [];
let folderSampai0008: string | null = null;

function buatFolderMigrasiSampai0008(): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034-b4c2a-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entries = journal.entries.filter((entry) => entry.idx <= 8);
  for (const entry of entries) {
    fs.copyFileSync(
      path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`),
      path.join(folder, `${entry.tag}.sql`),
    );
  }
  fs.writeFileSync(
    path.join(folder, "meta", "_journal.json"),
    JSON.stringify({ ...journal, entries }, null, 2),
  );
  return folder;
}

async function buatDatabase(): Promise<void> {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    await server.query(`CREATE DATABASE \`${DATABASE}\``);
  } finally {
    await server.end();
  }
}

async function hapusDatabase(): Promise<void> {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${DATABASE}\``);
  } finally {
    await server.end();
  }
}

function pesanGalat(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current && typeof current === "object" && messages.length < 5) {
    const item = current as { message?: unknown; cause?: unknown };
    if (typeof item.message === "string") messages.push(item.message);
    current = item.cause;
  }
  return messages.join(" | ");
}

beforeAll(async () => {
  const base = validasiDatabaseUji(process.env);
  const url = new URL(base.dsn);
  url.pathname = `/${DATABASE}`;
  const { opsiKoneksi } = validasiDsnUji(url.toString());

  await buatDatabase();
  pool = mysql.createPool({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
    database: DATABASE,
    multipleStatements: true,
  });
  folderSampai0008 = buatFolderMigrasiSampai0008();
  const instance = drizzle(pool, { mode: "default" });
  await migrate(instance, { migrationsFolder: folderSampai0008 });

  const conn = await pool.getConnection();
  try {
    await conn.query(
      "INSERT INTO villages (id, name, code) VALUES (923, 'B4C2A Guard A', 'B4C2AGA')",
    );
    await conn.query(
      "INSERT INTO villages (id, name, code) VALUES (924, 'B4C2A Guard B', 'B4C2AGB')",
    );
    await conn.query(
      "INSERT INTO letter_classifications (id, village_id, code, name) VALUES (923,923,'KA','Klasifikasi A'),(924,924,'KB','Klasifikasi B')",
    );

    // Simulate legacy records: one cross-tenant reference and one orphan per relation.
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query(
      "INSERT INTO incoming_letters (village_id, received_date, letter_number, classification_id) VALUES (923,'2026-01-01','IN-LINTAS',924),(923,'2026-01-01','IN-ORPHAN',999999)",
    );
    await conn.query(
      "INSERT INTO letter_dinas (village_id, letter_number, letter_date, subject, classification_id) VALUES (923,'DN-LINTAS','2026-01-01','Dinas lintas',924),(923,'DN-ORPHAN','2026-01-01','Dinas orphan',999999)",
    );
    await conn.query(
      "INSERT INTO letter_types (village_id, code, name, template_body, classification_id) VALUES (923,'LTL','Jenis lintas','Isi',924),(923,'LTO','Jenis orphan','Isi',999999)",
    );
    await conn.query(
      "INSERT INTO outgoing_letters (village_id, letter_number, letter_date, classification_id) VALUES (923,'OUT-LINTAS','2026-01-01',924),(923,'OUT-ORPHAN','2026-01-01',999999)",
    );
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    conn.release();
  }

  try {
    await migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (error) {
    galatMigrasi = error;
  }

  const [findings] = await pool.query<RowDataPacket[]>(
    "SELECT relasi, jenis, jumlah FROM _b4c2a_tenant_preflight_findings ORDER BY relasi, jenis",
  );
  temuan = findings.map((row) => ({
    relasi: String(row.relasi),
    jenis: String(row.jenis),
    jumlah: Number(row.jumlah),
  }));

  const [constraints] = await pool.query<RowDataPacket[]>(
    "SELECT CONSTRAINT_NAME AS nama FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?",
    [DATABASE],
  );
  fk = constraints.map((row) => String(row.nama));

  const [indexes] = await pool.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS tabel, INDEX_NAME AS nama FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND INDEX_NAME='letter_classifications_village_id_uq'",
    [DATABASE],
  );
  indexParent = indexes.map((row) => ({ tabel: String(row.tabel), nama: String(row.nama) }));
}, 180_000);

afterAll(async () => {
  if (pool) await pool.end();
  if (folderSampai0008) fs.rmSync(folderSampai0008, { recursive: true, force: true });
  await hapusDatabase();
});

describe("AUD-034 B4C-2a migration preflight", () => {
  it("gagal-closed dan menyebut jumlah temuan pada error", () => {
    expect(galatMigrasi).toBeDefined();
    expect(pesanGalat(galatMigrasi)).toContain("B4C2A");
  });

  it("mendeteksi orphan dan cross-tenant pada keempat relasi", () => {
    expect(temuan).toHaveLength(8);
    for (const relation of RELASI) {
      expect(temuan).toContainEqual({ relasi: relation, jenis: "cross-tenant", jumlah: 1 });
      expect(temuan).toContainEqual({ relasi: relation, jenis: "orphan", jumlah: 1 });
    }
  });

  it("tidak mengganti FK lama atau memasang unique parent ketika preflight gagal", () => {
    for (const nama of [
      "incoming_letters_classification_id_letter_classifications_id_fk",
      "letter_dinas_classification_id_letter_classifications_id_fk",
      "letter_types_classification_id_letter_classifications_id_fk",
      "outgoing_letters_classification_id_letter_classifications_id_fk",
    ]) {
      expect(fk).toContain(nama);
    }
    for (const nama of [
      "incoming_letters_classification_tenant_fk",
      "letter_dinas_classification_tenant_fk",
      "letter_types_classification_tenant_fk",
      "outgoing_letters_classification_tenant_fk",
    ]) {
      expect(fk).not.toContain(nama);
    }
    expect(indexParent).toHaveLength(0);
  });
});
