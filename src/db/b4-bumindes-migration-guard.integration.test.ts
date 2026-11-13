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

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();

type JenisTemuan = "cross-tenant" | "orphan";

interface HasilSkenario {
  error: unknown;
  foreignKeys: string[];
  uniqueIndex: string[];
  temuan: Array<{ relasi: string; jenis: string; jumlah: number }>;
  tabelAbortAda: boolean;
}

interface Skenario {
  hasil: HasilSkenario | null;
  cleanup: (() => Promise<void>) | null;
}

function buatFolderMigrasiSampai(idxMaks: number): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034b4-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entries = journal.entries.filter((entry) => entry.idx <= idxMaks);
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

async function buatDatabase(namaDatabase: string): Promise<void> {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${namaDatabase}\``);
    await server.query(`CREATE DATABASE \`${namaDatabase}\``);
  } finally {
    await server.end();
  }
}

async function hapusDatabase(namaDatabase: string): Promise<void> {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${namaDatabase}\``);
  } finally {
    await server.end();
  }
}

async function jalankanSkenario(jenis: JenisTemuan, suffix: string): Promise<() => Promise<void>> {
  const namaDatabase = `desa_test_aud034b4g_${RUN}_${suffix}`;
  const dasar = validasiDatabaseUji(process.env);
  const url = new URL(dasar.dsn);
  url.pathname = `/${namaDatabase}`;
  const { opsiKoneksi } = validasiDsnUji(url.toString());
  const folderSampai0005 = buatFolderMigrasiSampai(5);

  await buatDatabase(namaDatabase);
  const pool: Pool = mysql.createPool({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
    database: namaDatabase,
    multipleStatements: true,
  });

  try {
    const instance = drizzle(pool, { mode: "default" });
    await migrate(instance, { migrationsFolder: folderSampai0005 });

    const connection = await pool.getConnection();
    try {
      await connection.query(
        "INSERT INTO villages (id, name, code) VALUES (903, 'Guard B4 A', 'GBA034B4')",
      );
      await connection.query(
        "INSERT INTO villages (id, name, code) VALUES (904, 'Guard B4 B', 'GBB034B4')",
      );
      await connection.query(
        "INSERT INTO bumindes_buku (id, village_id, kode_buku, nama_buku) VALUES (903, 903, 'GBA', 'Buku A')",
      );
      await connection.query(
        "INSERT INTO bumindes_buku (id, village_id, kode_buku, nama_buku) VALUES (904, 904, 'GBB', 'Buku B')",
      );
      await connection.query("SET FOREIGN_KEY_CHECKS=0");
      try {
        const bukuId = jenis === "cross-tenant" ? 904 : 999999;
        await connection.query(
          "INSERT INTO bumindes_item (village_id, buku_id, uraian) VALUES (903, ?, 'Legacy item')",
          [bukuId],
        );
      } finally {
        await connection.query("SET FOREIGN_KEY_CHECKS=1");
      }
    } finally {
      connection.release();
    }

    let error: unknown = null;
    try {
      await migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
    } catch (caught) {
      error = caught;
    }

    const [foreignKeys] = await pool.query<RowDataPacket[]>(
      `SELECT CONSTRAINT_NAME AS nama
       FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'bumindes_item'`,
      [namaDatabase],
    );
    const [uniqueIndex] = await pool.query<RowDataPacket[]>(
      `SELECT INDEX_NAME AS nama
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bumindes_buku'
         AND INDEX_NAME = 'bumindes_buku_village_id_uq'`,
      [namaDatabase],
    );
    const [temuan] = await pool.query<RowDataPacket[]>(
      "SELECT relasi, jenis, jumlah FROM `_b4_bumindes_preflight_findings`",
    );
    const [abortTable] = await pool.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS nama
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = '_b4_bumindes_preflight_abort'`,
      [namaDatabase],
    );

    skenario[jenis].hasil = {
      error,
      foreignKeys: foreignKeys.map((row) => String(row.nama)).sort(),
      uniqueIndex: uniqueIndex.map((row) => String(row.nama)),
      temuan: temuan.map((row) => ({
        relasi: String(row.relasi),
        jenis: String(row.jenis),
        jumlah: Number(row.jumlah),
      })),
      tabelAbortAda: abortTable.length > 0,
    };
  } catch (error) {
    await pool.end();
    fs.rmSync(folderSampai0005, { recursive: true, force: true });
    await hapusDatabase(namaDatabase);
    throw error;
  }

  await pool.end();
  fs.rmSync(folderSampai0005, { recursive: true, force: true });
  return () => hapusDatabase(namaDatabase);
}

const skenario: Record<JenisTemuan, Skenario> = {
  "cross-tenant": { hasil: null, cleanup: null },
  orphan: { hasil: null, cleanup: null },
};

function hasilSkenario(jenis: JenisTemuan): HasilSkenario {
  const hasil = skenario[jenis].hasil;
  if (hasil === null) throw new Error(`Skenario B4 ${jenis} belum dijalankan.`);
  return hasil;
}

function pesanLengkap(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current && typeof current === "object" && messages.length < 5) {
    const value = current as { message?: unknown; cause?: unknown };
    if (typeof value.message === "string") messages.push(value.message);
    current = value.cause;
  }
  return messages.join(" | ");
}

beforeAll(async () => {
  skenario["cross-tenant"].cleanup = await jalankanSkenario("cross-tenant", "c");
  skenario.orphan.cleanup = await jalankanSkenario("orphan", "o");
}, 180_000);

afterAll(async () => {
  for (const jenis of ["cross-tenant", "orphan"] as const) {
    const cleanup = skenario[jenis].cleanup;
    if (cleanup) await cleanup();
  }
});

describe.each(["cross-tenant", "orphan"] as const)("B4 migration guard — %s", (jenis) => {
  it("menghentikan migration dengan pesan yang menyebut relasi, jenis, dan jumlah", () => {
    const hasil = hasilSkenario(jenis);
    expect(hasil.error, "migration harus gagal saat preflight menemukan data legacy").toBeDefined();
    expect(pesanLengkap(hasil.error)).toContain(
      `B4 BUMDes: bumindes_item.buku_id ${jenis} = 1 baris`,
    );
  });

  it("gagal-closed sebelum mengubah FK atau unique key", () => {
    const hasil = hasilSkenario(jenis);
    expect(hasil.foreignKeys).toContain("bumindes_item_buku_id_bumindes_buku_id_fk");
    expect(hasil.foreignKeys).not.toContain("bumindes_item_buku_tenant_fk");
    expect(hasil.uniqueIndex).toEqual([]);
  });

  it("menyimpan agregat preflight untuk diagnosis", () => {
    const hasil = hasilSkenario(jenis);
    expect(hasil.temuan).toEqual([{ relasi: "bumindes_item.buku_id", jenis, jumlah: 1 }]);
    expect(hasil.tabelAbortAda).toBe(true);
  });
});
