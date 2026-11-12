import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { validasiDatabaseUji, validasiDsnUji } from "./db-test-guard";

/**
 * Menjalankan migrasi basis data uji di bawah kunci MySQL.
 *
 * Beberapa berkas `*.integration.test.ts` berjalan paralel dan masing-masing
 * memanggil `migrate()` pada basis data yang sama. Tanpa kunci, dua proses dapat
 * mengeksekusi migrasi yang sama dan salah satunya gagal dengan
 * `ER_TABLE_EXISTS_ERROR`. Kunci dilepas di blok `finally` dan juga otomatis
 * bila koneksi tertutup.
 *
 * DSN divalidasi ulang di sini. Pemanggil langsung tidak dapat memigrasi
 * database di luar allowlist meski melewati setup guard.
 */
export async function jalankanMigrasiUji(
  db: Parameters<typeof migrate>[0],
  opsi: { dsn: string; migrationsFolder: string },
): Promise<void> {
  validasiDsnUji(opsi.dsn);

  const koneksi = await mysql.createConnection(opsi.dsn);
  const kunci = "sid_desa_migrasi_uji";
  try {
    const [baris] = await koneksi.query<(RowDataPacket & { ok: number })[]>(
      "SELECT GET_LOCK(?, 120) AS ok",
      [kunci],
    );
    if (Number(baris[0]?.ok) !== 1) {
      throw new Error("Gagal memperoleh kunci migrasi basis data uji (timeout).");
    }
    await migrate(db, { migrationsFolder: opsi.migrationsFolder });
  } finally {
    await koneksi.query("SELECT RELEASE_LOCK(?)", [kunci]);
    await koneksi.end();
  }
}

/**
 * Siapkan database integration test secara lengkap: validasi environment,
 * buat database (hanya nama yang diizinkan), lalu migrasi.
 *
 * Semua validasi dijalankan **sebelum** operasi tulis pertama. Kegagalan
 * koneksi/migrasi sengaja dilempar ke pemanggil sehingga suite gagal, bukan
 * dilewati diam-diam.
 */
export async function siapkanDatabaseUji(
  db: Parameters<typeof migrate>[0],
  opsi: { migrationsFolder: string },
): Promise<{ dsn: string; database: string }> {
  const { dsn, database } = validasiDatabaseUji(process.env);

  const dsnServer = new URL(dsn);
  dsnServer.pathname = "/";
  const server = await mysql.createConnection(dsnServer.toString());
  try {
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await server.end();
  }

  await jalankanMigrasiUji(db, { dsn, migrationsFolder: opsi.migrationsFolder });

  return { dsn, database };
}
