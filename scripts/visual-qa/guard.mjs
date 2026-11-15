/**
 * Guard basis data visual QA.
 *
 * Visual QA menulis fixture sintetis dan menjalankan aplikasi terhadap database
 * yang sama. Karena itu target harus dibuktikan disposable sebelum operasi tulis
 * pertama. Aturannya sengaja sama ketatnya dengan guard integration test
 * (`src/testing/db-test-guard.ts`), tetapi memakai nama database sendiri supaya
 * tidak pernah bertabrakan dengan `desa_test*`:
 *
 * 1. `VISUAL_QA_DATABASE_ACK` harus `1` — pernyataan eksplisit operator.
 * 2. `NODE_ENV` tidak boleh `production`.
 * 3. DSN wajib `mysql:` (default hanya bila env kosong), host loopback,
 *    tanpa query string/fragment.
 * 4. Nama database wajib cocok `desa_visual_qa` atau `desa_visual_qa_<suffix>`
 *    dan tidak memuat penanda produksi/pengembangan.
 *
 * Koneksi harus dibuka dari `opsiKoneksi` (field eksplisit tanpa query param),
 * bukan dari string DSN. Pesan error tidak pernah memuat DSN lengkap karena
 * dapat berisi kredensial.
 */

/** Host yang diizinkan: hanya loopback. */
const HOST_LOKAL = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** Nama database yang boleh dipakai visual QA. */
export const POLA_NAMA_DATABASE_VISUAL = /^desa_visual_qa(?:_[a-z0-9][a-z0-9_]{0,31})?$/;

/** DSN bawaan yang cocok dengan `compose.visual-qa.yml`. */
export const DSN_BAWAAN = "mysql://root:visual_qa_root@127.0.0.1:3307/desa_visual_qa";

function gagal(pesan) {
  throw new Error(`[visual-qa] ${pesan}`);
}

/** Ambil nama database dari DSN tanpa memercayai bentuk input. */
export function namaDatabaseDariDsn(dsn) {
  let url;
  try {
    url = new URL(dsn);
  } catch {
    gagal("VISUAL_QA_DATABASE_URL bukan URL yang valid.");
  }

  if (url.protocol !== "mysql:") {
    gagal(`Protokol database harus "mysql:", bukan "${url.protocol}".`);
  }

  let nama;
  try {
    nama = decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    gagal("Nama database pada VISUAL_QA_DATABASE_URL tidak dapat dibaca.");
  }
  if (!nama) gagal("VISUAL_QA_DATABASE_URL tidak menyebutkan nama database.");

  return nama;
}

/**
 * Validasi DSN visual QA dan hasilkan opsi koneksi eksplisit.
 * Melempar error (fail-closed) bila ada satu syarat yang tidak terpenuhi.
 */
export function validasiDsnVisual(dsn) {
  let url;
  try {
    url = new URL(dsn);
  } catch {
    gagal("VISUAL_QA_DATABASE_URL bukan URL yang valid.");
  }

  if (url.protocol !== "mysql:") {
    gagal(`Protokol database harus "mysql:", bukan "${url.protocol}".`);
  }

  // mysql2 menyalin query param apa pun ke ConnectionConfig; `socketPath` atau
  // `ssl` dapat mengubah tujuan/metode koneksi di luar host yang divalidasi.
  if (url.search !== "") {
    gagal("VISUAL_QA_DATABASE_URL tidak boleh memuat query string.");
  }
  if (url.hash !== "") {
    gagal("VISUAL_QA_DATABASE_URL tidak boleh memuat fragment.");
  }

  if (!HOST_LOKAL.has(url.hostname)) {
    gagal(
      `Host database "${url.hostname}" ditolak. Visual QA hanya boleh memakai host loopback (127.0.0.1/localhost).`,
    );
  }

  const port = url.port === "" ? 3306 : Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    gagal(`Port database "${url.port}" tidak valid.`);
  }

  let user;
  let password;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    gagal("Kredensial pada VISUAL_QA_DATABASE_URL tidak dapat dibaca.");
  }

  const database = namaDatabaseDariDsn(dsn);
  if (!POLA_NAMA_DATABASE_VISUAL.test(database)) {
    gagal(
      `Nama database "${database}" tidak diizinkan. Gunakan "desa_visual_qa" atau "desa_visual_qa_<suffix>" (huruf kecil, angka, garis bawah).`,
    );
  }
  if (/(^|_)(prod|production|dev|development)($|_)/.test(database)) {
    gagal(`Nama database "${database}" memuat penanda produksi/pengembangan.`);
  }

  const hostKoneksi = url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname;

  return {
    dsn,
    database,
    host: url.hostname,
    opsiKoneksi: { host: hostKoneksi, port, user, password, database },
  };
}

/**
 * Validasi environment visual QA. Dipakai sebelum migrasi, seed, atau start
 * aplikasi. `DATABASE_URL` pengembangan sengaja tidak pernah dibaca.
 */
export function validasiEnvVisual(sumber = process.env) {
  if (sumber.NODE_ENV === "production") {
    gagal("NODE_ENV=production ditolak: visual QA hanya untuk database lokal disposable.");
  }
  if (sumber.VISUAL_QA_DATABASE_ACK !== "1") {
    gagal(
      "VISUAL_QA_DATABASE_ACK wajib bernilai 1. Setel hanya setelah memastikan database target disposable (lihat compose.visual-qa.yml).",
    );
  }

  const dsn = (sumber.VISUAL_QA_DATABASE_URL ?? "").trim() || DSN_BAWAAN;
  return validasiDsnVisual(dsn);
}

/** Ringkasan aman untuk log: tanpa kredensial. */
export function ringkasTarget(konfigurasi) {
  return `${konfigurasi.database} @ ${konfigurasi.host}:${konfigurasi.opsiKoneksi.port}`;
}
