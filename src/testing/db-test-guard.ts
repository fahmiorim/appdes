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
 * 6. Query string dan fragment ditolak. `mysql2` menyalin setiap query param ke
 *    opsi koneksi; parameter seperti `socketPath` dapat mengesampingkan host
 *    yang sudah divalidasi. Tidak ada parameter yang dibutuhkan saat ini,
 *    sehingga allowlist-nya kosong (fail-closed).
 *
 * Koneksi harus dibuat dari `opsiKoneksi`, bukan dari `dsn`. `opsiKoneksi`
 * berisi field yang persis sama dengan hasil parsing `mysql2` (tanpa query /
 * fragment), sehingga tidak ada opsi tersembunyi yang ikut terbawa.
 *
 * Pesan error tidak pernah memuat DSN lengkap karena dapat berisi kredensial.
 */

/** Opsi koneksi eksplisit; bentuknya sama dengan hasil `mysql2` parseUrl. */
export interface OpsiKoneksiUji {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface KonfigurasiDatabaseUji {
  /** DSN asli (hanya dipakai untuk koneksi; jangan dicetak ke log). */
  dsn: string;
  /** Nama database tanpa karakter slash. */
  database: string;
  /** Hostname loopback yang sudah divalidasi, dalam bentuk asli URL. */
  host: string;
  /** Opsi koneksi tanpa query/fragment; wajib dipakai untuk membuka koneksi. */
  opsiKoneksi: OpsiKoneksiUji;
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
    // Tanpa trim: nama yang dipakai mysql2 tidak di-trim, jadi nilai yang
    // divalidasi harus identik dengan nilai yang benar-benar dibuka.
    nama = decodeURIComponent(url.pathname.replace(/^\//, ""));
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
 * Validasi DSN secara mandiri (protokol, host loopback, nama database, tanpa
 * query/fragment) dan hasilkan opsi koneksi eksplisit.
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

  // mysql2 menyalin query param apa pun ke ConnectionConfig. `socketPath`,
  // misalnya, membuat koneksi tidak lagi ke host yang divalidasi. Tidak ada
  // parameter yang dibutuhkan integration test, jadi semuanya ditolak.
  if (url.search !== "") {
    gagal(
      "TEST_DATABASE_URL tidak boleh memuat query string. Parameter seperti socketPath/host/ssl dapat mengubah tujuan atau metode koneksi.",
    );
  }
  if (url.hash !== "") {
    gagal("TEST_DATABASE_URL tidak boleh memuat fragment.");
  }

  if (!HOST_LOKAL.has(url.hostname)) {
    gagal(
      `Host database "${url.hostname}" ditolak. Integration test hanya boleh memakai host loopback (127.0.0.1/localhost).`,
    );
  }

  const port = url.port === "" ? 3306 : Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    gagal(`Port database "${url.port}" tidak valid.`);
  }

  let user: string;
  let password: string;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    gagal("Kredensial pada TEST_DATABASE_URL tidak dapat dibaca.");
  }

  // mysql2 membuang bracket IPv6 pada parseUrl; samakan agar objek opsi yang
  // kita berikan menunjuk host yang sama persis.
  const hostKoneksi = url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname;
  const database = pastikanNamaDatabaseUji(dsn);

  return {
    dsn,
    database,
    host: url.hostname,
    opsiKoneksi: {
      host: hostKoneksi,
      port,
      user,
      password,
      database,
    },
  };
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
