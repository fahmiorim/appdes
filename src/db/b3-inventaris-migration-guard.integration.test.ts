import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { validasiDatabaseUji, validasiDsnUji } from "@/testing/db-test-guard";

/**
 * AUD-034 Batch 3 — preflight `0005` harus gagal-closed.
 *
 * Migration `0005` memeriksa dua kondisi pada `inventaris_mutasi.inventaris_id`:
 * `cross-tenant` (menunjuk inventaris desa lain) dan `orphan` (menunjuk ID yang
 * tidak ada). Keduanya diuji pada database terpisah (`desa_test_aud034b3g_*`):
 * migrasi dijalankan sampai `0004`, satu baris legacy disuntikkan dengan
 * `FOREIGN_KEY_CHECKS=0` (meniru data lama), lalu migrasi penuh dicoba.
 *
 * Migrasi harus berhenti **sebelum** satu pun constraint berubah, dan pesan
 * error harus menyebut relasi, jenis, serta jumlah baris.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();

type JenisTemuan = "cross-tenant" | "orphan";

interface HasilSkenario {
  galatMigrasi: unknown;
  fkSetelahGagal: string[];
  indexSetelahGagal: string[];
  temuanTersisa: Array<{ relasi: string; jenis: string; jumlah: number }>;
  tabelAbortTersisa: boolean;
}

interface Skenario {
  hasil: HasilSkenario | null;
  tutup: (() => Promise<void>) | null;
}

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

async function buatDatabaseKosong(namaDatabase: string): Promise<void> {
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

/**
 * Suntikkan data legacy yang seharusnya ditolak preflight.
 *
 * `FOREIGN_KEY_CHECKS=0` diperlukan karena FK yang berlaku saat itu
 * (`inventaris_id` single-column) sudah menolak referensi yang tidak ada;
 * kondisi `cross-tenant` sendiri lolos FK lama.
 */
async function suntikLegacy(conn: PoolConnection, jenis: JenisTemuan): Promise<void> {
  await conn.query("SET FOREIGN_KEY_CHECKS=0");
  try {
    if (jenis === "cross-tenant") {
      // Mutasi desa A menunjuk inventaris desa B.
      await conn.query(
        `INSERT INTO inventaris_mutasi (village_id, inventaris_id, jenis, tanggal_mutasi, alasan)
         VALUES (903, 904, 'pindah', '2026-02-01', 'Mutasi Legacy Cross Tenant')`,
      );
      return;
    }
    // Mutasi desa A menunjuk inventaris yang tidak ada.
    await conn.query(
      `INSERT INTO inventaris_mutasi (village_id, inventaris_id, jenis, tanggal_mutasi, alasan)
       VALUES (903, 999999, 'pindah', '2026-02-01', 'Mutasi Legacy Orphan')`,
    );
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
  }
}

async function jalankanSkenario(jenis: JenisTemuan, suffix: string): Promise<() => Promise<void>> {
  const namaDatabase = `desa_test_aud034b3g_${RUN}_${suffix}`;
  const dasar = validasiDatabaseUji(process.env);
  const url = new URL(dasar.dsn);
  url.pathname = `/${namaDatabase}`;
  const { opsiKoneksi } = validasiDsnUji(url.toString());

  await buatDatabaseKosong(namaDatabase);
  const pool: Pool = mysql.createPool({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
    database: namaDatabase,
    multipleStatements: true,
  });
  const folderSampai0004 = buatFolderMigrasiSampai(4);

  try {
    const instance = drizzle(pool, { mode: "default" });
    await migrate(instance, { migrationsFolder: folderSampai0004 });

    const conn = await pool.getConnection();
    try {
      await conn.query("INSERT INTO villages (id, name, code) VALUES (903, 'Guard A', 'GDA034B3')");
      await conn.query("INSERT INTO villages (id, name, code) VALUES (904, 'Guard B', 'GDB034B3')");
      await conn.query(
        "INSERT INTO inventaris (id, village_id, nama_barang, jumlah) VALUES (903, 903, 'Aset A', '1.00')",
      );
      await conn.query(
        "INSERT INTO inventaris (id, village_id, nama_barang, jumlah) VALUES (904, 904, 'Aset B', '1.00')",
      );
      await suntikLegacy(conn, jenis);
    } finally {
      conn.release();
    }

    let galatMigrasi: unknown = null;
    try {
      await migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
    } catch (error) {
      galatMigrasi = error;
    }

    const [fk] = await pool.query<RowDataPacket[]>(
      `SELECT CONSTRAINT_NAME AS nama
       FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'inventaris_mutasi'`,
      [namaDatabase],
    );

    const [index] = await pool.query<RowDataPacket[]>(
      `SELECT INDEX_NAME AS nama
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inventaris' AND INDEX_NAME = 'inventaris_village_id_uq'`,
      [namaDatabase],
    );

    const [temuan] = await pool.query<RowDataPacket[]>(
      "SELECT relasi, jenis, jumlah FROM `_b3_inventaris_preflight_findings`",
    );

    const [tabelAbort] = await pool.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS nama
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = '_b3_inventaris_preflight_abort'`,
      [namaDatabase],
    );

    const hasil: HasilSkenario = {
      galatMigrasi,
      fkSetelahGagal: fk.map((row) => String(row.nama)).sort(),
      indexSetelahGagal: index.map((row) => String(row.nama)),
      temuanTersisa: temuan.map((row) => ({
        relasi: String(row.relasi),
        jenis: String(row.jenis),
        jumlah: Number(row.jumlah),
      })),
      tabelAbortTersisa: tabelAbort.length > 0,
    };
    skenario[jenis].hasil = hasil;
  } finally {
    await pool.end();
    fs.rmSync(folderSampai0004, { recursive: true, force: true });
  }

  return () => hapusDatabase(namaDatabase);
}

const skenario: Record<JenisTemuan, Skenario> = {
  "cross-tenant": { hasil: null, tutup: null },
  orphan: { hasil: null, tutup: null },
};

function dataSkenario(jenis: JenisTemuan): HasilSkenario {
  const hasil = skenario[jenis].hasil;
  if (hasil === null) throw new Error(`Skenario ${jenis} belum dijalankan.`);
  return hasil;
}

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

beforeAll(async () => {
  skenario["cross-tenant"].tutup = await jalankanSkenario("cross-tenant", "c");
  skenario.orphan.tutup = await jalankanSkenario("orphan", "o");
}, 180_000);

afterAll(async () => {
  for (const jenis of ["cross-tenant", "orphan"] as const) {
    if (skenario[jenis].tutup !== null) await skenario[jenis].tutup!();
  }
});

describe.each(["cross-tenant", "orphan"] as const)(
  "B3 inventaris migration guard — %s",
  (jenis) => {
    it("berhenti dengan pesan preflight yang menyebut relasi, jenis, dan jumlah baris", () => {
      const hasil = dataSkenario(jenis);

      expect(hasil.galatMigrasi, "migrasi seharusnya gagal karena data legacy").toBeDefined();
      // Prefiks sengaja pendek: InnoDB memotong nilai kunci duplikat pada pesan
      // error setelah 64 karakter, sehingga relasi + jenis + jumlah harus muat.
      expect(pesanLengkap(hasil.galatMigrasi)).toMatch(
        new RegExp(`B3 inv: inventaris_mutasi\\.inventaris_id ${jenis} = 1 baris`),
      );
    });

    it("tidak mengubah constraint apa pun ketika preflight gagal", () => {
      const hasil = dataSkenario(jenis);

      expect(hasil.fkSetelahGagal).toContain("inventaris_mutasi_inventaris_id_inventaris_id_fk");
      expect(hasil.fkSetelahGagal).not.toContain("inventaris_mutasi_inventaris_tenant_fk");
      expect(hasil.indexSetelahGagal).toEqual([]);
    });

    it("meninggalkan tabel temuan untuk diagnosis sebelum cleanup manual", () => {
      const hasil = dataSkenario(jenis);

      // MySQL DDL auto-commit: statement pemicu gagal sebelum DROP, sehingga
      // tabel helper tetap ada. Perilaku ini didokumentasikan pada laporan
      // (runbook cleanup) dan aman karena retry dimulai dengan DROP IF EXISTS.
      expect(hasil.temuanTersisa).toEqual([
        { relasi: "inventaris_mutasi.inventaris_id", jenis, jumlah: 1 },
      ]);
      expect(hasil.tabelAbortTersisa).toBe(true);
    });
  },
);
