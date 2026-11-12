/**
 * Setup khusus integration test.
 *
 * Dijalankan sebelum berkas test (dan sebelum `@/db` membuat pool), sehingga
 * `DATABASE_URL` yang dipakai aplikasi selalu berasal dari `TEST_DATABASE_URL`
 * yang sudah divalidasi guard. Tidak ada fallback ke `.env` pengembangan.
 */
import { validasiDatabaseUji } from "./db-test-guard";

const konfigurasi = validasiDatabaseUji(process.env);

process.env.DATABASE_URL = konfigurasi.dsn;

// Hanya nama database dan host yang dicetak; DSN dapat memuat kredensial.
process.stdout.write(`[integration-db] Target: ${konfigurasi.database} @ ${konfigurasi.host}\n`);
