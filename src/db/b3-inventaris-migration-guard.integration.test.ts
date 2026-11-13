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
 * AUD-034 Batch 3 — preflight 0005 harus gagal-closed pada data legacy lintas
 * desa.
 *
 * Test memakai database sendiri (`desa_test_aud034b3g_*`), memigrasi sampai
 * 0004, menyuntikkan satu baris `inventaris_mutasi` yang menunjuk inventaris
 * desa lain dengan `FOREIGN_KEY_CHECKS=0` (meniru data lama), lalu mencoba
 * migrasi penuh. Migrasi harus berhenti **sebelum** satu pun constraint
 * berubah.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();
const NAMA_DATABASE = `desa_test_aud034b3g_${RUN}`;

let pool: Pool | null = null;

function buatFolderMigrasiSampai(idxMaks: number): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034b3-migrasi-"));
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

let migrasiSampai0004: string | null = null;
let galatMigrasi: unknown = null;
let fkSetelahGagal: string[] = [];
let indexSetelahGagal: string[] = [];

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

  migrasiSampai0004 = buatFolderMigrasiSampai(4);
  await migrate(instance, { migrationsFolder: migrasiSampai0004 });

  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query("INSERT INTO villages (id, name, code) VALUES (903, 'Guard A', 'GDA034B3')");
    await conn.query("INSERT INTO villages (id, name, code) VALUES (904, 'Guard B', 'GDB034B3')");
    await conn.query(
      "INSERT INTO inventaris (id, village_id, nama_barang, jumlah) VALUES (903, 903, 'Aset A', '1.00')",
    );
    await conn.query(
      "INSERT INTO inventaris (id, village_id, nama_barang, jumlah) VALUES (904, 904, 'Aset B', '1.00')",
    );
    // Data legacy: mutasi desa A menunjuk inventaris desa B.
    await conn.query(
      `INSERT INTO inventaris_mutasi (village_id, inventaris_id, jenis, tanggal_mutasi, alasan)
       VALUES (903, 904, 'pindah', '2026-02-01', 'Mutasi Legacy')`,
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

  const [fk] = await pool.query<RowDataPacket[]>(
    `SELECT CONSTRAINT_NAME AS nama
     FROM information_schema.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'inventaris_mutasi'`,
    [NAMA_DATABASE],
  );
  fkSetelahGagal = fk.map((row) => String(row.nama)).sort();

  const [index] = await pool.query<RowDataPacket[]>(
    `SELECT INDEX_NAME AS nama
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inventaris' AND INDEX_NAME = 'inventaris_village_id_uq'`,
    [NAMA_DATABASE],
  );
  indexSetelahGagal = index.map((row) => String(row.nama));
});

afterAll(async () => {
  if (migrasiSampai0004 !== null) {
    fs.rmSync(migrasiSampai0004, { recursive: true, force: true });
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

describe("B3 inventaris migration guard", () => {
  it("berhenti dengan pesan preflight saat ada referensi lintas desa", () => {
    expect(galatMigrasi, "migrasi seharusnya gagal karena data legacy").toBeDefined();
    // Prefiks sengaja pendek: InnoDB memotong nilai kunci duplikat pada pesan
    // error setelah 64 karakter, sehingga relasi + jenis + jumlah harus muat.
    expect(pesanLengkap(galatMigrasi)).toMatch(
      /B3 inv: inventaris_mutasi\.inventaris_id cross-tenant = 1 baris/,
    );
  });

  it("tidak mengubah constraint apa pun ketika preflight gagal", () => {
    expect(fkSetelahGagal).toContain("inventaris_mutasi_inventaris_id_inventaris_id_fk");
    expect(fkSetelahGagal).not.toContain("inventaris_mutasi_inventaris_tenant_fk");
    expect(indexSetelahGagal).toEqual([]);
  });
});
