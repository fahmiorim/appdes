/**
 * Migrasi database visual QA.
 *
 * Memakai DSN dari `VISUAL_QA_DATABASE_URL` yang sudah divalidasi guard, lalu:
 * 1. membuat database (hanya nama yang diizinkan) lewat koneksi server tanpa
 *    nama database;
 * 2. menjalankan migration Drizzle dari `src/db/migrations`.
 *
 * `DATABASE_URL` pengembangan/produksi tidak pernah dibaca, dan koneksi dibuat
 * dari field eksplisit (bukan string URL) agar query param tidak dapat
 * menyelundupkan opsi koneksi.
 */
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

import { ringkasTarget, validasiEnvVisual } from "./guard.mjs";

const konfigurasi = validasiEnvVisual();
const { opsiKoneksi } = konfigurasi;

process.stdout.write(`[visual-qa] Migrasi ke ${ringkasTarget(konfigurasi)}\n`);

const server = await mysql.createConnection({
  host: opsiKoneksi.host,
  port: opsiKoneksi.port,
  user: opsiKoneksi.user,
  password: opsiKoneksi.password,
});
try {
  await server.query(`CREATE DATABASE IF NOT EXISTS \`${konfigurasi.database}\``);
} finally {
  await server.end();
}

const pool = mysql.createPool({ ...opsiKoneksi, connectionLimit: 2 });
try {
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL("../../src/db/migrations/", import.meta.url)),
  });
} finally {
  await pool.end();
}

process.stdout.write("[visual-qa] Migrasi selesai.\n");
