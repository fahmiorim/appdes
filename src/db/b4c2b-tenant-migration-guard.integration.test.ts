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
const DATABASE = `desa_test_aud034b4c2bg_${RUN}`;
const RELASI = [
  "analisis_indikator.kategori_id",
  "area.ref_polygon",
  "inventaris.kategori_id",
  "kelompok.category_id",
] as const;

let pool: Pool | null = null;
let galatMigrasi: unknown = null;
let temuan: Array<{ relasi: string; jenis: string; jumlah: number }> = [];
let fk: string[] = [];
let indexParent: Array<{ tabel: string; nama: string }> = [];
let folderSampai0009: string | null = null;

function buatFolderMigrasiSampai0009(): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034-b4c2b-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entries = journal.entries.filter((entry) => entry.idx <= 9);
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

async function bukaKoneksiServer() {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  return mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
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
  const server = await bukaKoneksiServer();
  try {
    await server.query(`CREATE DATABASE \`${DATABASE}\``);
  } finally {
    await server.end();
  }

  pool = mysql.createPool({ ...opsiKoneksi, multipleStatements: true });
  folderSampai0009 = buatFolderMigrasiSampai0009();
  const instance = drizzle(pool, { mode: "default" });
  await migrate(instance, { migrationsFolder: folderSampai0009 });

  const conn = await pool.getConnection();
  try {
    await conn.query(
      "INSERT INTO villages (id, name, code) VALUES (923, 'B4C2B Guard A', 'B4C2BGA'), (924, 'B4C2B Guard B', 'B4C2BGB')",
    );
    await conn.query(
      "INSERT INTO analisis_kategori (id, village_id, nama) VALUES (923,923,'Analisis A'),(924,924,'Analisis B')",
    );
    await conn.query(
      "INSERT INTO polygon (id, village_id, nama) VALUES (923,923,'Polygon A'),(924,924,'Polygon B')",
    );
    await conn.query(
      "INSERT INTO inventaris_kategori (id, village_id, kode, nama, golongan) VALUES (923,923,'IA','Inventaris A','tanah'),(924,924,'IB','Inventaris B','tanah')",
    );
    await conn.query(
      "INSERT INTO kelompok_master (id, village_id, name, type) VALUES (923,923,'Kelompok A','kelompok'),(924,924,'Kelompok B','kelompok')",
    );

    // Simulate data written before tenant composite constraints existed.
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query(
      "INSERT INTO analisis_indikator (village_id,kategori_id,kode,nama) VALUES (923,924,'A-L','Analisis lintas'),(923,999999,'A-O','Analisis orphan')",
    );
    await conn.query(
      "INSERT INTO area (village_id,nama,ref_polygon) VALUES (923,'Area lintas',924),(923,'Area orphan',999999)",
    );
    await conn.query(
      "INSERT INTO inventaris (village_id,kategori_id,nama_barang) VALUES (923,924,'Inventaris lintas'),(923,999999,'Inventaris orphan')",
    );
    await conn.query(
      "INSERT INTO kelompok (village_id,name,slug,type,category_id) VALUES (923,'Kelompok lintas','kelompok-lintas','kelompok',924),(923,'Kelompok orphan','kelompok-orphan','kelompok',999999)",
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
    "SELECT relasi, jenis, jumlah FROM _b4c2b_tenant_preflight_findings ORDER BY relasi, jenis",
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
    "SELECT TABLE_NAME AS tabel, INDEX_NAME AS nama FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND INDEX_NAME IN ('analisis_kategori_village_id_uq','polygon_village_id_uq','inventaris_kategori_village_id_uq','kelompok_master_village_id_uq')",
    [DATABASE],
  );
  indexParent = indexes.map((row) => ({ tabel: String(row.tabel), nama: String(row.nama) }));
}, 180_000);

afterAll(async () => {
  if (pool) await pool.end();
  if (folderSampai0009) fs.rmSync(folderSampai0009, { recursive: true, force: true });
  const server = await bukaKoneksiServer();
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${DATABASE}\``);
  } finally {
    await server.end();
  }
});

describe("AUD-034 B4C-2b migration preflight", () => {
  it("gagal-closed dan menyebut temuan pada pesan migration", () => {
    expect(galatMigrasi).toBeDefined();
    expect(pesanGalat(galatMigrasi)).toContain("B4C2B");
  });

  it("mendeteksi orphan dan cross-tenant pada keempat relasi", () => {
    expect(temuan).toHaveLength(8);
    for (const relasi of RELASI) {
      expect(temuan).toContainEqual({ relasi, jenis: "cross-tenant", jumlah: 1 });
      expect(temuan).toContainEqual({ relasi, jenis: "orphan", jumlah: 1 });
    }
  });

  it("tidak mengganti FK lama atau memasang unique parent saat preflight gagal", () => {
    for (const nama of [
      "analisis_indikator_kategori_id_analisis_kategori_id_fk",
      "area_ref_polygon_polygon_id_fk",
      "inventaris_kategori_id_inventaris_kategori_id_fk",
      "kelompok_category_id_kelompok_master_id_fk",
    ]) {
      expect(fk).toContain(nama);
    }
    for (const nama of [
      "analisis_indikator_kategori_tenant_fk",
      "area_polygon_tenant_fk",
      "inventaris_kategori_tenant_fk",
      "kelompok_category_tenant_fk",
    ]) {
      expect(fk).not.toContain(nama);
    }
    expect(indexParent).toHaveLength(0);
  });
});
