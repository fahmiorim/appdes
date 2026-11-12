import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { validasiDatabaseUji } from "./db-test-guard";

/**
 * Menjalankan migrasi basis data uji di bawah kunci MySQL.
 *
 * Beberapa berkas `*.integration.test.ts` berjalan paralel dan masing-masing
 * memanggil `migrate()` pada basis data yang sama. Tanpa kunci, dua proses dapat
 * mengeksekusi migrasi yang sama dan salah satunya gagal dengan
 * `ER_TABLE_EXISTS_ERROR`. Kunci dilepas di blok `finally` dan juga otomatis
 * bila koneksi tertutup.
 *
 * Guard environment lengkap dijalankan ulang di sini **sebelum** koneksi
 * dibuka: `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, dan `TEST_DATABASE_URL` yang
 * valid. Pemanggil langsung tidak dapat memigrasi database hanya dengan DSN
 * yang lolos pemeriksaan host/nama. `DATABASE_URL` (yang dipakai pool Drizzle)
 * juga wajib sama dengan DSN tervalidasi agar migrasi tidak menulis ke database
 * lain. Koneksi lock memakai opsi eksplisit dari guard, bukan string URL.
 */
export async function jalankanMigrasiUji(
  db: Parameters<typeof migrate>[0],
  opsi: { dsn: string; migrationsFolder: string },
): Promise<void> {
  const konfigurasi = validasiDatabaseUji(process.env);

  if (opsi.dsn !== konfigurasi.dsn) {
    throw new Error(
      "[integration-db] DSN migrasi berbeda dari TEST_DATABASE_URL yang divalidasi. Migrasi dibatalkan.",
    );
  }

  if (process.env.DATABASE_URL !== konfigurasi.dsn) {
    throw new Error(
      "[integration-db] DATABASE_URL berbeda dari TEST_DATABASE_URL. Migrasi dibatalkan agar tidak menyentuh database lain.",
    );
  }

  const koneksi = await mysql.createConnection(konfigurasi.opsiKoneksi);
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
  const { dsn, database, opsiKoneksi } = validasiDatabaseUji(process.env);

  // Koneksi server dibuat dari field eksplisit tanpa nama database. String URL
  // tidak pernah diberikan ke mysql2 agar query param/fragment tidak dapat
  // menyelundupkan opsi koneksi.
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await server.end();
  }

  await jalankanMigrasiUji(db, { dsn, migrationsFolder: opsi.migrationsFolder });

  return { dsn, database };
}
