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

/**
 * B2 — preflight 0004 harus gagal-closed pada data legacy lintas desa.
 *
 * Test memakai database sendiri (`desa_test_aud034g_*`), memigrasi sampai 0003,
 * menyuntikkan satu baris `dokumen_warga` yang menunjuk penduduk desa lain
 * dengan `FOREIGN_KEY_CHECKS=0` (meniru data lama), lalu mencoba migrasi penuh.
 * Migrasi harus berhenti **sebelum** satu pun constraint berubah.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();
const NAMA_DATABASE = `desa_test_aud034g_${RUN}`;

let pool: Pool | null = null;

function buatFolderMigrasiSampai(idxMaks: number): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entri = journal.entries.filter((item) => item.idx <= idxMaks);
  for (const item of entri) {
    fs.copyFileSync(
      path.join(MIGRATIONS_FOLDER, `${item.tag}.sql`),
      path.join(folder, `${item.tag}.sql`),
    );
  }
  fs.writeFileSync(
    path.join(folder, "meta", "_journal.json"),
    JSON.stringify({ ...journal, entries: entri }, null, 2),
  );
  return folder;
}

async function buatDatabaseKosong(): Promise<void> {
  // Koneksi server dibuat tanpa nama database agar dapat membuat database uji
  // yang belum ada. Kredensial berasal dari TEST_DATABASE_URL yang tervalidasi.
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${NAMA_DATABASE}\``);
    await server.query(`CREATE DATABASE \`${NAMA_DATABASE}\``);
  } finally {
    await server.end();
  }
}

let migrasiSampai0003: string | null = null;
let galatMigrasi: unknown = null;
let fkSetelahGagal: string[] = [];

beforeAll(async () => {
  const dasar = validasiDatabaseUji(process.env);
  const url = new URL(dasar.dsn);
  url.pathname = `/${NAMA_DATABASE}`;
  const dsn = url.toString();
  const { opsiKoneksi } = validasiDsnUji(dsn);

  await buatDatabaseKosong();
  pool = mysql.createPool({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
    database: NAMA_DATABASE,
    multipleStatements: true,
  });
  const instance = drizzle(pool, { mode: "default" });

  migrasiSampai0003 = buatFolderMigrasiSampai(3);
  await migrate(instance, { migrationsFolder: migrasiSampai0003 });

  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query("INSERT INTO villages (id, name, code) VALUES (901, 'Guard A', 'GDA034')");
    await conn.query("INSERT INTO villages (id, name, code) VALUES (902, 'Guard B', 'GDB034')");
    await conn.query(
      "INSERT INTO residents (id, village_id, name, gender) VALUES (901, 901, 'Penduduk A', 'male')",
    );
    await conn.query(
      "INSERT INTO residents (id, village_id, name, gender) VALUES (902, 902, 'Penduduk B', 'female')",
    );
    // Data legacy: dokumen milik desa A menunjuk penduduk desa B.
    await conn.query(
      `INSERT INTO dokumen_warga (village_id, resident_id, jenis, nama, berkas, mime, nama_asli)
       VALUES (901, 902, 'ktp', 'Dokumen Legacy', 'legacy/ktp.pdf', 'application/pdf', 'ktp.pdf')`,
    );
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    conn.release();
  }

  try {
    await migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (error) {
    galatMigrasi = error;
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT CONSTRAINT_NAME AS nama
     FROM information_schema.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'dokumen_warga'`,
    [NAMA_DATABASE],
  );
  fkSetelahGagal = rows.map((row) => String(row.nama)).sort();
});

afterAll(async () => {
  if (migrasiSampai0003 !== null) {
    fs.rmSync(migrasiSampai0003, { recursive: true, force: true });
  }
  if (pool !== null) {
    await pool.end();
    const opsiKoneksi = validasiDatabaseUji(process.env).opsiKoneksi;
    const server = await mysql.createConnection({
      host: opsiKoneksi.host,
      port: opsiKoneksi.port,
      user: opsiKoneksi.user,
      password: opsiKoneksi.password,
    });
    try {
      await server.query(`DROP DATABASE IF EXISTS \`${NAMA_DATABASE}\``);
    } finally {
      await server.end();
    }
  }
});

function pesanLengkap(error: unknown): string {
  const bagian: string[] = [];
  let current: unknown = error;
  while (current !== null && typeof current === "object" && bagian.length < 5) {
    const item = current as { message?: unknown; cause?: unknown };
    if (typeof item.message === "string") bagian.push(item.message);
    current = item.cause;
  }
  return bagian.join(" | ");
}

describe("B2 resident migration guard", () => {
  it("berhenti dengan pesan preflight saat ada referensi lintas desa", () => {
    expect(galatMigrasi, "migrasi seharusnya gagal karena data legacy").toBeDefined();
    expect(pesanLengkap(galatMigrasi)).toMatch(
      /B2 resident: dokumen_warga\.resident_id cross-tenant = 1 baris/,
    );
  });

  it("tidak mengubah constraint apa pun ketika preflight gagal", () => {
    expect(fkSetelahGagal).toContain("dokumen_warga_resident_id_residents_id_fk");
    expect(fkSetelahGagal).not.toContain("dokumen_warga_resident_tenant_fk");
  });
});
