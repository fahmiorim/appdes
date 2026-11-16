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

/** AUD-034 B4C-1: verify 0008 aborts before replacing constraints on legacy data. */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();
const DATABASE = `desa_test_aud034b4c1g_${RUN}`;

let pool: Pool | null = null;
let galatMigrasi: unknown = null;
let temuan: Array<{ relasi: string; jenis: string; jumlah: number }> = [];
let fk: string[] = [];
let indexParent: Array<{ tabel: string; nama: string }> = [];
let folderSampai0007: string | null = null;

function buatFolderMigrasiSampai0007(): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034-b4c1-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entries = journal.entries.filter((entry) => entry.idx <= 7);
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
  folderSampai0007 = buatFolderMigrasiSampai0007();
  const instance = drizzle(pool, { mode: "default" });
  await migrate(instance, { migrationsFolder: folderSampai0007 });

  const conn = await pool.getConnection();
  try {
    await conn.query("INSERT INTO villages (id, name, code) VALUES (913, 'B4C1 Guard A', 'B4CGA')");
    await conn.query("INSERT INTO villages (id, name, code) VALUES (914, 'B4C1 Guard B', 'B4CGB')");
    await conn.query(
      "INSERT INTO berita_kategori (id, village_id, nama, slug) VALUES (913,913,'Kategori A','kategori-a'),(914,914,'Kategori B','kategori-b')",
    );
    await conn.query(
      "INSERT INTO jabatan_perangkat (id, village_id, nama, slug) VALUES (913,913,'Jabatan A','jabatan-a'),(914,914,'Jabatan B','jabatan-b')",
    );

    // Simulate legacy records: one cross-tenant reference and one orphan per relation.
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query(
      "INSERT INTO berita (village_id, kategori_id, judul, slug, isi) VALUES (913,914,'Lintas desa','lintas','isi'),(913,999999,'Tanpa induk','tanpa-induk','isi')",
    );
    await conn.query(
      "INSERT INTO perangkat_desa (village_id, jabatan_id, nama) VALUES (913,914,'Perangkat lintas'),(913,999999,'Perangkat tanpa induk')",
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
    "SELECT relasi, jenis, jumlah FROM _b4c1_tenant_preflight_findings ORDER BY relasi, jenis",
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
    "SELECT TABLE_NAME AS tabel, INDEX_NAME AS nama FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND INDEX_NAME IN ('berita_kategori_village_id_uq','jabatan_perangkat_village_id_uq')",
    [DATABASE],
  );
  indexParent = indexes.map((row) => ({ tabel: String(row.tabel), nama: String(row.nama) }));
}, 180_000);

afterAll(async () => {
  if (pool) await pool.end();
  if (folderSampai0007) fs.rmSync(folderSampai0007, { recursive: true, force: true });
  await hapusDatabase();
});

describe("AUD-034 B4C-1 migration preflight", () => {
  it("gagal-closed dan menyebut jumlah temuan pada error", () => {
    expect(galatMigrasi).toBeDefined();
    expect(pesanGalat(galatMigrasi)).toContain("B4C1");
  });

  it("mendeteksi orphan dan cross-tenant pada kedua relasi", () => {
    expect(temuan).toHaveLength(4);
    for (const relation of ["berita.kategori_id", "perangkat_desa.jabatan_id"]) {
      expect(temuan).toContainEqual({ relasi: relation, jenis: "cross-tenant", jumlah: 1 });
      expect(temuan).toContainEqual({ relasi: relation, jenis: "orphan", jumlah: 1 });
    }
  });

  it("tidak mengganti FK lama atau memasang unique parent ketika preflight gagal", () => {
    expect(fk).toContain("berita_kategori_id_berita_kategori_id_fk");
    expect(fk).toContain("perangkat_desa_jabatan_id_jabatan_perangkat_id_fk");
    expect(fk).not.toContain("berita_kategori_tenant_fk");
    expect(fk).not.toContain("perangkat_desa_jabatan_tenant_fk");
    expect(indexParent).toHaveLength(0);
  });
});
