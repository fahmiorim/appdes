/**
 * Guard basis data untuk integration test.
 *
 * Integration test membuat database, menjalankan migration, dan menulis fixture.
 * Karena itu targetnya harus dibuktikan sebagai database uji disposable sebelum
 * operasi tulis pertama. `NODE_ENV=test` saja tidak cukup: nilai itu mudah
 * terbawa dari konfigurasi lain dan tidak menyatakan database mana yang dituju.
 *
 * Aturan (fail-closed — semua wajib lolos):
 * 1. `NODE_ENV` harus `test`.
 * 2. `TEST_DATABASE_ACK` harus `1` sebagai pernyataan eksplisit operator bahwa
 *    database target memang disposable. Tidak ada nilai default.
 * 3. `TEST_DATABASE_URL` wajib ada. `DATABASE_URL` tidak pernah dipakai sebagai
 *    fallback agar konfigurasi pengembangan tidak terbawa.
 * 4. Protokol wajib `mysql:` dan host wajib loopback.
 * 5. Nama database wajib cocok allowlist `desa_test` atau `desa_test_<suffix>`
 *    dan tidak boleh ada pada denylist nama produksi/pengembangan.
 *
 * Pesan error tidak pernah memuat DSN lengkap karena dapat berisi kredensial.
 */

export interface KonfigurasiDatabaseUji {
  /** DSN asli (hanya dipakai untuk koneksi; jangan dicetak ke log). */
  dsn: string;
  /** Nama database tanpa karakter slash. */
  database: string;
  /** Hostname loopback yang sudah divalidasi. */
  host: string;
}

/** Nama database yang boleh dipakai integration test. */
export const POLA_NAMA_DATABASE_UJI = /^desa_test(?:_[a-z0-9][a-z0-9_]{0,31})?$/;

/** Host yang diizinkan: hanya loopback, tidak pernah host jaringan. */
const HOST_LOKAL = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/**
 * Nama yang ditolak meskipun (keliru) cocok pola. Pertahanan tambahan agar
 * database pengembangan/produksi tidak pernah menjadi target.
 */
const NAMA_DILARANG = new Set([
  "desa",
  "desa_dev",
  "desa_development",
  "desa_prod",
  "desa_production",
  "development",
  "production",
  "prod",
  "test",
  "mysql",
  "sys",
  "information_schema",
  "performance_schema",
]);

function gagal(pesan: string): never {
  throw new Error(`[integration-db] ${pesan}`);
}

/** Ambil nama database dari DSN tanpa memercayai bentuk input. */
export function namaDatabaseDariDsn(dsn: string): string {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    gagal("TEST_DATABASE_URL bukan URL yang valid.");
  }

  if (url.protocol !== "mysql:") {
    gagal(`Protokol database harus "mysql:", bukan "${url.protocol}".`);
  }

  let nama: string;
  try {
    nama = decodeURIComponent(url.pathname.replace(/^\//, "")).trim();
  } catch {
    gagal("Nama database pada TEST_DATABASE_URL tidak dapat dibaca.");
  }
  if (!nama) gagal("TEST_DATABASE_URL tidak menyebutkan nama database.");

  return nama;
}

/**
 * Pastikan sebuah DSN menunjuk database uji yang diizinkan.
 * Dipakai juga oleh `jalankanMigrasiUji` sebagai pertahanan berlapis.
 */
export function pastikanNamaDatabaseUji(dsn: string): string {
  const nama = namaDatabaseDariDsn(dsn);

  if (NAMA_DILARANG.has(nama)) {
    gagal(`Database "${nama}" ditolak: terdaftar sebagai nama pengembangan/produksi.`);
  }

  if (!POLA_NAMA_DATABASE_UJI.test(nama)) {
    gagal(
      `Nama database "${nama}" tidak diizinkan. Gunakan "desa_test" atau "desa_test_<suffix>" (huruf kecil, angka, garis bawah).`,
    );
  }

  // Suffix tetap bisa menyamar sebagai produksi/pengembangan (desa_test_prod).
  if (/(^|_)(prod|production|dev|development)($|_)/.test(nama)) {
    gagal(`Nama database "${nama}" memuat penanda produksi/pengembangan.`);
  }

  return nama;
}

/**
 * Validasi DSN secara mandiri (protokol, host loopback, nama database).
 * Dipakai juga oleh `jalankanMigrasiUji` agar pemanggil langsung tidak dapat
 * melewati aturan hanya karena tidak memakai guard environment.
 */
export function validasiDsnUji(dsn: string): KonfigurasiDatabaseUji {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    gagal("TEST_DATABASE_URL bukan URL yang valid.");
  }

  if (url.protocol !== "mysql:") {
    gagal(`Protokol database harus "mysql:", bukan "${url.protocol}".`);
  }

  if (!HOST_LOKAL.has(url.hostname)) {
    gagal(
      `Host database "${url.hostname}" ditolak. Integration test hanya boleh memakai host loopback (127.0.0.1/localhost).`,
    );
  }

  return { dsn, database: pastikanNamaDatabaseUji(dsn), host: url.hostname };
}

/**
 * Validasi environment integration test. Melempar error (fail-closed) bila ada
 * satu syarat yang tidak terpenuhi; pemanggil tidak boleh melanjutkan.
 */
export function validasiDatabaseUji(
  sumber: Readonly<Record<string, string | undefined>> = process.env,
): KonfigurasiDatabaseUji {
  if (sumber.NODE_ENV !== "test") {
    gagal(`NODE_ENV harus "test", bukan "${sumber.NODE_ENV ?? "(kosong)"}".`);
  }

  if (sumber.TEST_DATABASE_ACK !== "1") {
    gagal(
      "TEST_DATABASE_ACK wajib bernilai 1. Setel hanya setelah memastikan database target disposable dan boleh dimigrasi/dihapus.",
    );
  }

  const dsn = sumber.TEST_DATABASE_URL?.trim();
  if (!dsn) {
    gagal(
      "TEST_DATABASE_URL wajib diisi. DATABASE_URL sengaja tidak dipakai sebagai fallback agar database pengembangan tidak tersentuh.",
    );
  }

  return validasiDsnUji(dsn);
}
