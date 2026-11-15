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

/** AUD-034 B4B: verify 0007 aborts before replacing constraints on legacy data. */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();
const DATABASE = `desa_test_aud034b4bg_${RUN}`;

let pool: Pool | null = null;
let galatMigrasi: unknown = null;
let temuan: Array<{ relasi: string; jenis: string; jumlah: number }> = [];
let fk: string[] = [];
let indexParent: Array<{ tabel: string; nama: string }> = [];
let folderSampai0006: string | null = null;

function buatFolderMigrasiSampai0006(): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034-b4b-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entries = journal.entries.filter((entry) => entry.idx <= 6);
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
  folderSampai0006 = buatFolderMigrasiSampai0006();
  const instance = drizzle(pool, { mode: "default" });
  await migrate(instance, { migrationsFolder: folderSampai0006 });

  const conn = await pool.getConnection();
  try {
    await conn.query("INSERT INTO villages (id, name, code) VALUES (913, 'B4B Guard A', 'B4BGA')");
    await conn.query("INSERT INTO villages (id, name, code) VALUES (914, 'B4B Guard B', 'B4BGB')");
    await conn.query(
      "INSERT INTO residents (id, village_id, name, gender) VALUES (913,913,'Warga A','female'),(914,914,'Warga B','male')",
    );

    await conn.query(
      "INSERT INTO kontak (id, village_id, nama) VALUES (913,913,'Kontak A'),(914,914,'Kontak B')",
    );
    await conn.query(
      "INSERT INTO kontak_grup (id, village_id, nama_grup) VALUES (913,913,'Grup A'),(914,914,'Grup B')",
    );
    await conn.query(
      "INSERT INTO incoming_letters (id, village_id, received_date, letter_number) VALUES (913,913,'2026-01-01','SMA'),(914,914,'2026-01-01','SMB')",
    );
    await conn.query(
      "INSERT INTO outgoing_letters (id, village_id, letter_number, letter_date) VALUES (913,913,'SKA','2026-01-01'),(914,914,'SKB','2026-01-01')",
    );
    await conn.query(
      "INSERT INTO kelompok (id, village_id, name, slug, type) VALUES (913,913,'Kelompok A','kelompok-a','kelompok'),(914,914,'Kelompok B','kelompok-b','kelompok')",
    );

    // Simulate legacy records: one cross-tenant reference and one orphan per relation.
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query(
      "INSERT INTO anggota_grup_kontak (village_id, grup_id, kontak_id) VALUES (913,913,914),(913,913,999999)",
    );
    await conn.query(
      "INSERT INTO anggota_grup_kontak (village_id, grup_id, kontak_id) VALUES (913,914,913),(913,999999,913)",
    );
    await conn.query(
      "INSERT INTO incoming_letter_dispositions (village_id, incoming_letter_id, instruction) VALUES (913,914,'cross'),(913,999999,'orphan')",
    );
    await conn.query(
      "INSERT INTO outgoing_letter_shipments (village_id, outgoing_letter_id, sent_date) VALUES (913,914,'2026-01-01'),(913,999999,'2026-01-01')",
    );
    await conn.query(
      "INSERT INTO kelompok_anggota (village_id, kelompok_id, resident_id, position) VALUES (913,914,913,90),(913,999999,913,91)",
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
    "SELECT relasi, jenis, jumlah FROM _b4b_tenant_preflight_findings ORDER BY relasi, jenis",
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
    "SELECT TABLE_NAME AS tabel, INDEX_NAME AS nama FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND INDEX_NAME IN ('kontak_village_id_uq','kontak_grup_village_id_uq','incoming_letters_village_id_uq','outgoing_letters_village_id_uq')",
    [DATABASE],
  );
  indexParent = indexes.map((row) => ({ tabel: String(row.tabel), nama: String(row.nama) }));
}, 180_000);

afterAll(async () => {
  if (pool) await pool.end();
  if (folderSampai0006) fs.rmSync(folderSampai0006, { recursive: true, force: true });
  await hapusDatabase();
});

describe("AUD-034 B4B migration preflight", () => {
  it("gagal-closed dan menyebut jumlah temuan pada error", () => {
    expect(galatMigrasi).toBeDefined();
    expect(pesanGalat(galatMigrasi)).toContain("B4B");
  });

  it("mendeteksi orphan dan cross-tenant pada kelima relasi", () => {
    expect(temuan).toHaveLength(10);
    for (const relation of [
      "anggota_grup_kontak.kontak_id",
      "anggota_grup_kontak.grup_id",
      "incoming_letter_dispositions.incoming_letter_id",
      "outgoing_letter_shipments.outgoing_letter_id",
      "kelompok_anggota.kelompok_id",
    ]) {
      expect(temuan).toContainEqual({ relasi: relation, jenis: "cross-tenant", jumlah: 1 });
      expect(temuan).toContainEqual({ relasi: relation, jenis: "orphan", jumlah: 1 });
    }
  });

  it("tidak mengganti FK lama atau memasang unique parent ketika preflight gagal", () => {
    expect(fk).toContain("anggota_grup_kontak_kontak_id_kontak_id_fk");
    expect(fk).toContain("anggota_grup_kontak_grup_id_kontak_grup_id_fk");
    expect(fk).toContain("ild_incoming_letter_id_fk");
    expect(fk).toContain("ols_outgoing_letter_id_fk");
    expect(fk).toContain("kelompok_anggota_kelompok_id_kelompok_id_fk");
    expect(fk).not.toContain("anggota_grup_kontak_kontak_tenant_fk");
    expect(fk).not.toContain("kelompok_anggota_kelompok_tenant_fk");
    expect(indexParent).toHaveLength(0);
  });
});
