import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql, { type RowDataPacket } from "mysql2/promise";

/**
 * Menjalankan migrasi basis data uji di bawah kunci MySQL.
 *
 * Beberapa berkas `*.integration.test.ts` berjalan paralel dan masing-masing
 * memanggil `migrate()` pada basis data yang sama. Tanpa kunci, dua proses dapat
 * mengeksekusi migrasi yang sama dan salah satunya gagal dengan
 * `ER_TABLE_EXISTS_ERROR`. Kunci dilepas di blok `finally` dan juga otomatis
 * bila koneksi tertutup.
 */
export async function jalankanMigrasiUji(
  db: Parameters<typeof migrate>[0],
  opsi: { dsn: string; migrationsFolder: string },
): Promise<void> {
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
