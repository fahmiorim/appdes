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

/** AUD-034 B4: verify 0006 aborts before replacing constraints on legacy data. */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();
const DATABASE = `desa_test_aud034b4g_${RUN}`;

let pool: Pool | null = null;
let galatMigrasi: unknown = null;
let temuan: Array<{ relasi: string; jenis: string; jumlah: number }> = [];
let fk: string[] = [];
let indexParent: Array<{ tabel: string; nama: string }> = [];
let folderSampai0005: string | null = null;

function buatFolderMigrasiSampai0005(): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034-b4-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entries = journal.entries.filter((entry) => entry.idx <= 5);
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
  folderSampai0005 = buatFolderMigrasiSampai0005();
  const instance = drizzle(pool, { mode: "default" });
  await migrate(instance, { migrationsFolder: folderSampai0005 });

  const conn = await pool.getConnection();
  try {
    await conn.query("INSERT INTO villages (id, name, code) VALUES (903, 'B4 Guard A', 'B4GDA')");
    await conn.query("INSERT INTO villages (id, name, code) VALUES (904, 'B4 Guard B', 'B4GDB')");

    await conn.query(
      "INSERT INTO bumindes_buku (id, village_id, kode_buku, nama_buku) VALUES (903,903,'B4A','Buku A'),(904,904,'B4B','Buku B')",
    );
    await conn.query(
      "INSERT INTO bumindes_tanah_kas (id, village_id, nomor_persil) VALUES (903,903,'TA'),(904,904,'TB')",
    );
    await conn.query(
      "INSERT INTO galeri_album (id, village_id, nama, slug) VALUES (903,903,'Album A','album-a'),(904,904,'Album B','album-b')",
    );
    await conn.query(
      "INSERT INTO lapak (id, village_id, nama) VALUES (903,903,'Lapak A'),(904,904,'Lapak B')",
    );
    await conn.query(
      "INSERT INTO pengaduan (id, village_id, nomor_tiket, judul, isi, nama_pelapor) VALUES (903,903,'PGA','A','A','A'),(904,904,'PGB','B','B','B')",
    );
    await conn.query(
      "INSERT INTO pemilihan (id, village_id, tahun, jenis) VALUES (903,903,2026,'kepala_desa'),(904,904,2026,'kepala_desa')",
    );

    // Simulate legacy records: one cross-tenant reference and one orphan per relation.
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query(
      "INSERT INTO bumindes_item (village_id,buku_id,uraian) VALUES (903,904,'cross'),(903,999999,'orphan')",
    );
    await conn.query(
      "INSERT INTO bumindes_tanah_kas_mutasi (village_id,tanah_kas_id,tanggal,jenis,uraian) VALUES (903,904,'2026-01-01','ubah','cross'),(903,999999,'2026-01-01','ubah','orphan')",
    );
    await conn.query(
      "INSERT INTO galeri_foto (village_id,album_id,gambar) VALUES (903,904,'cross.jpg'),(903,999999,'orphan.jpg')",
    );
    await conn.query(
      "INSERT INTO lapak_produk (village_id,lapak_id,nama,harga) VALUES (903,904,'cross',1),(903,999999,'orphan',1)",
    );
    await conn.query(
      "INSERT INTO bukti_pengiriman_notifikasi (village_id,pengaduan_id,metode,target) VALUES (903,904,'email','cross@example.test'),(903,999999,'email','orphan@example.test')",
    );
    await conn.query(
      "INSERT INTO pemilihan_kandidat (village_id,pemilihan_id,nomor_urut,nama) VALUES (903,904,1,'cross'),(903,999999,2,'orphan')",
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
    "SELECT relasi, jenis, jumlah FROM _b4_tenant_preflight_findings ORDER BY relasi, jenis",
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
    "SELECT TABLE_NAME AS tabel, INDEX_NAME AS nama FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND INDEX_NAME IN ('bumindes_buku_village_id_uq','bumindes_tanah_kas_village_id_uq','galeri_album_village_id_uq','lapak_village_id_uq','pengaduan_village_id_uq','pemilihan_village_id_uq')",
    [DATABASE],
  );
  indexParent = indexes.map((row) => ({ tabel: String(row.tabel), nama: String(row.nama) }));
}, 180_000);

afterAll(async () => {
  if (pool) await pool.end();
  if (folderSampai0005) fs.rmSync(folderSampai0005, { recursive: true, force: true });
  await hapusDatabase();
});

describe("AUD-034 B4 migration preflight", () => {
  it("gagal-closed dan menyebut jumlah temuan pada error", () => {
    expect(galatMigrasi).toBeDefined();
    expect(pesanGalat(galatMigrasi)).toContain("B4");
  });

  it("mendeteksi orphan dan cross-tenant pada keenam relasi", () => {
    expect(temuan).toHaveLength(12);
    for (const relation of [
      "bumindes_item.buku_id",
      "bumindes_tanah_kas_mutasi.tanah_kas_id",
      "galeri_foto.album_id",
      "lapak_produk.lapak_id",
      "bukti_pengiriman_notifikasi.pengaduan_id",
      "pemilihan_kandidat.pemilihan_id",
    ]) {
      expect(temuan).toContainEqual({ relasi: relation, jenis: "cross-tenant", jumlah: 1 });
      expect(temuan).toContainEqual({ relasi: relation, jenis: "orphan", jumlah: 1 });
    }
  });

  it("tidak mengganti FK lama atau memasang unique parent ketika preflight gagal", () => {
    expect(fk).toContain("bumindes_item_buku_id_bumindes_buku_id_fk");
    expect(fk).toContain("bumindes_tanah_kas_mutasi_tanah_kas_id_bumindes_tanah_kas_id_fk");
    expect(fk).toContain("galeri_foto_album_id_galeri_album_id_fk");
    expect(fk).toContain("lapak_produk_lapak_id_lapak_id_fk");
    expect(fk).toContain("bukti_pengiriman_notifikasi_pengaduan_id_pengaduan_id_fk");
    expect(fk).toContain("pemilihan_kandidat_pemilihan_id_pemilihan_id_fk");
    expect(fk).not.toContain("bumindes_item_buku_tenant_fk");
    expect(indexParent).toHaveLength(0);
  });
});
