# Laporan — Phase 0.1: Guard Hardening (Revisi B-03)

> **Proyek:** Appdes SID (`fahmiorim/appdes`)
> **Tanggal:** 12 November 2026
> **Jenis task:** perbaikan temuan review integration test safety
> **Base:** `origin/main` @ `c7c2ffc` (via `task/phase-0-integration-safety` @ `2cb2a83`)
> **Branch:** `task/phase-0-integration-safety-hardening`
> **Commit implementasi:** `8c389358f0b15e526f9fc86423f9e5f720469ba9`
> **Lingkungan verifikasi:** Windows, Git Bash, Node `v26.2.0`, MySQL lokal `127.0.0.1:3306`

## 1. Ringkasan

Review Phase 0.1 menemukan dua celah pada guard yang sudah ada:

- **Temuan A (ACK bypass):** `jalankanMigrasiUji()` hanya memvalidasi DSN, sehingga pemanggil langsung dapat memicu migrasi tanpa `NODE_ENV=test` dan `TEST_DATABASE_ACK=1`.
- **Temuan B (connection options):** DSN berbentuk URL diteruskan apa adanya ke `mysql2`. Query parameter seperti `socketPath` disalin ke opsi koneksi dan dapat mengesampingkan host yang sudah divalidasi.

Keduanya diperbaiki secara fail-closed. `jalankanMigrasiUji()` kini menjalankan guard environment lengkap dan mencocokkan DSN sebelum membuka koneksi. DSN dengan query string/fragment ditolak seluruhnya, dan koneksi dibuka dari objek opsi eksplisit hasil guard — bukan dari string URL — sehingga tidak ada opsi tersembunyi yang ikut terbawa.

Tidak ada schema, migration, dependency, atau perilaku modul aplikasi yang diubah.

## 2. Analisis masalah

### 2.1 Temuan A — jalur migrasi melewati ACK

Kode sebelumnya:

```ts
validasiDsnUji(opsi.dsn);
const koneksi = await mysql.createConnection(opsi.dsn);
```

`validasiDsnUji()` hanya memeriksa protokol, host loopback, dan nama database. Siapa pun yang memanggil `jalankanMigrasiUji()` dengan DSN `desa_test` yang valid dapat melewati `NODE_ENV`, `TEST_DATABASE_ACK`, dan pemeriksaan `TEST_DATABASE_URL`. `siapkanDatabaseUji()` memang memvalidasi environment, tetapi fungsi migrasi tetap dapat dipanggil langsung.

### 2.2 Temuan B — query string menimpa tujuan koneksi

`mysql2` (`node_modules/mysql2/lib/connection_config.js`, `parseUrl`) melakukan:

```js
for (const [key, value] of parsedUrl.searchParams) {
  if (key in options) continue;
  options[key] = value;
}
```

Kunci yang sudah ada (`host`, `port`, `database`, `user`, `password`) dilewati, tetapi kunci lain **ditambahkan** ke `ConnectionConfig`. `socketPath` termasuk opsi yang tidak ada pada hasil parse dasar dan dipakai untuk koneksi Unix socket, sehingga host loopback yang divalidasi tidak lagi menjadi tujuan sebenarnya. Opsi lain seperti `ssl` juga dapat mengubah perilaku koneksi.

Karena URL mentah diberikan ke `mysql2`, parsing kedua kalinya di luar kendali guard. Fragment tidak dipakai `mysql2`, tetapi tetap ditolak agar kontrak DSN sempit dan tidak ada bentuk URL ambigu yang lolos.

## 3. Perubahan yang dilakukan

### 3.1 `src/testing/db-test-guard.ts`

- Menolak **semua** query string (`url.search !== ""`) dan fragment (`url.hash !== ""`). Tidak ada allowlist parameter karena integration test tidak membutuhkannya.
- Menambahkan `opsiKoneksi` pada hasil validasi: `{ host, port, user, password, database }`.
  - Port default `3306` bila tidak ditulis; port di luar 1–65535 ditolak.
  - Kredensial di-decode sama seperti `mysql2`; kegagalan decode ditolak.
  - Bracket IPv6 dibuang agar identik dengan `parseUrl` milik `mysql2`.
- Menghapus `.trim()` pada nama database. Sebelumnya `desa_test%20` bisa lolos sebagai `desa_test` padahal `mysql2` membuka nama dengan spasi; sekarang ditolak oleh allowlist.
- Dokumentasi guard diperbarui untuk menjelaskan query/fragment dan kewajiban memakai `opsiKoneksi`.

### 3.2 `src/testing/migrasi-uji.ts`

`jalankanMigrasiUji()` sekarang, **sebelum** `createConnection`:

1. Menjalankan `validasiDatabaseUji(process.env)` penuh: `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, `TEST_DATABASE_URL` valid.
2. Menolak bila `opsi.dsn` berbeda dari DSN tervalidasi.
3. Menolak bila `process.env.DATABASE_URL` (yang dipakai pool Drizzle) berbeda dari DSN tervalidasi.
4. Baru membuka koneksi lock memakai `konfigurasi.opsiKoneksi`, bukan string URL.

`siapkanDatabaseUji()` juga membuat koneksi server dari field eksplisit tanpa nama database, bukan dari `new URL(dsn).toString()`. `CREATE DATABASE` tetap hanya berjalan setelah guard environment lolos.

### 3.3 Test

- `src/testing/db-test-guard.test.ts`: 45 tes (sebelumnya 29). Tambahan mencakup 10 variasi query string (`socketPath`, `host`, `port`, `database`, `user`, `password`, `ssl`, charset, multipleStatements), fragment, query yang disamarkan dalam nama database, nama dengan spasi, port 0, port default, dan opsi koneksi eksplisit/IPv6.
- `src/testing/migrasi-uji.test.ts` (**baru**): 8 tes dengan `mysql2` dan `migrate` dimock. Membuktikan migrasi ditolak tanpa ACK, dengan `NODE_ENV` bukan test, DSN pemanggil berbeda, `DATABASE_URL` berbeda, dan query string — semuanya **tanpa** memanggil `createConnection` atau `migrate`. Jalur sukses membuktikan koneksi memakai objek opsi eksplisit dan `CREATE DATABASE` tidak membawa nama database pada koneksi server.

### 3.4 `.env.example`

Dokumentasi guard diperjelas: query string/fragment ditolak karena dapat mengubah tujuan koneksi.

## 4. File yang diperiksa dan diubah

### Diperiksa

- `AGENTS.md` dan `docs/reports/00-baseline/integration-safety-report.md`.
- `node_modules/mysql2/lib/connection_config.js` (`ConnectionConfig.parseUrl`) untuk memastikan perilaku query parameter.
- `src/testing/db-test-guard.ts`, `src/testing/migrasi-uji.ts`, `src/testing/setup-integration.ts`.
- `vitest.config.mts`, `vitest.integration.config.mts`, `package.json`, `.env.example`.
- 9 suite integration test yang memakai `siapkanDatabaseUji()`.

### Diubah

| File | Alasan |
|---|---|
| `src/testing/db-test-guard.ts` | Tolak query/fragment; hasilkan opsi koneksi eksplisit; perketat nama database. |
| `src/testing/migrasi-uji.ts` | Guard environment lengkap dan pencocokan DSN sebelum koneksi/migrasi. |
| `src/testing/db-test-guard.test.ts` | Negative test untuk setiap bypass URL dan opsi koneksi. |
| `src/testing/migrasi-uji.test.ts` | **Baru.** Bukti tidak ada koneksi/migrasi sebelum guard lolos. |
| `.env.example` | Dokumentasi larangan query string/fragment. |

Tidak ada perubahan schema, migration, dependency, atau file aplikasi non-test.

## 5. Validasi

Semua perintah dijalankan dari root proyek. Integration test hanya dijalankan pada database disposable `desa_test_phase01` di `127.0.0.1`; database tersebut tidak di-drop.

| Pemeriksaan | Perintah | Status |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** (exit 0) |
| ESLint | `npm run lint` | **PASS** (exit 0, tanpa error/warning) |
| Format | `npm run format:check` (via `npm run check`) | **PASS** (`All matched files use Prettier code style!`) |
| Unit test | `npm test` | **PASS** — 184 berkas, 1537 tes, 0 gagal |
| Test terfokus | `npx vitest run --config vitest.config.mts src/testing/db-test-guard.test.ts src/testing/migrasi-uji.test.ts` | **PASS** — 2 berkas, 53 tes |
| Gabungan | `npm run check` | **PASS** (exit 0) |
| Integration | `node node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts` dengan `TEST_DATABASE_URL=…/desa_test_phase01`, `TEST_DATABASE_ACK=1` | **PASS** — 9 berkas, 34 tes, 0 skip |
| Guard negatif (CLI) | lihat tabel di bawah | **PASS** — semua exit 1 sebelum koneksi |

### Guard negatif melalui CLI

| Kasus | Hasil |
|---|---|
| Tanpa `TEST_DATABASE_URL` dan `TEST_DATABASE_ACK` | **exit 1**, `TEST_DATABASE_ACK wajib bernilai 1` |
| Nama `desa_dev` | **exit 1**, database ditolak |
| Host `db.contoh.id` | **exit 1**, host ditolak |
| `?socketPath=/tmp/mysql.sock` | **exit 1**, `tidak boleh memuat query string` |
| Fragment `#utama` | **exit 1**, `tidak boleh memuat fragment` |

### Guard negatif melalui unit test migrasi

| Kasus | Bukti tambahan |
|---|---|
| Tanpa ACK | `createConnection` dan `migrate` tidak dipanggil |
| `NODE_ENV=development` | `createConnection` dan `migrate` tidak dipanggil |
| DSN pemanggil ≠ `TEST_DATABASE_URL` | `createConnection` dan `migrate` tidak dipanggil |
| `DATABASE_URL` ≠ `TEST_DATABASE_URL` | `createConnection` dan `migrate` tidak dipanggil |
| `TEST_DATABASE_URL` ber-query `socketPath` | `createConnection` dan `migrate` tidak dipanggil |
| `siapkanDatabaseUji` tanpa ACK | tidak ada koneksi server, tidak ada `CREATE DATABASE` |

## 6. Risiko dan keterbatasan

| Risiko | Catatan |
|---|---|
| `TEST_DATABASE_ACK` tetap deklaratif | Operator masih dapat keliru meng-ack database lokal bernama `desa_test` yang berisi data penting. Guard tidak memeriksa isi database. |
| `localhost` bergantung resolusi DNS lokal | `localhost` diizinkan dan dapat diarahkan lewat hosts file; risiko lokal, bukan jalur remote. |
| Drizzle `db` berasal dari pemanggil | Guard mencocokkan `DATABASE_URL` dengan DSN tervalidasi, tetapi fungsi menerima instance `db`; pemanggil internal yang sengaja membuat koneksi lain di luar pola setup tidak dapat dideteksi dari sini. Tidak ada jalur seperti itu di suite saat ini. |
| Query string ditolak seluruhnya | Jika suatu saat integration test membutuhkan parameter sah (mis. charset), harus ditambahkan allowlist eksplisit dan test tersendiri. |
| Tidak ada pengecekan database kosong | Database bernama benar tetapi berisi data tetap dapat dimigrasi/ditulis. |
| Tidak ada teardown | `desa_test_phase01` sengaja tidak di-drop untuk menghindari operasi destruktif. |
| Hanya diuji pada MySQL lokal | Belum diuji pada MariaDB atau image CI lain. |

## 7. Kesimpulan

- Temuan A tertutup: tidak ada pemanggilan migrasi yang dapat melewati `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, dan `TEST_DATABASE_URL` yang valid; koneksi/migrasi tidak dibuka bila guard gagal.
- Temuan B tertutup: query string/fragment ditolak, dan `mysql2` hanya menerima field koneksi eksplisit yang berasal dari validasi — bukan URL mentah — sehingga `socketPath` dan opsi sejenis tidak dapat menyelundup.
- Guard lama tidak dilemahkan: allowlist/denylist, loopback, dan pemisahan unit/integration tetap berlaku; tidak ada assertion yang dihapus.
- **Status: siap review.** Belum di-merge; menunggu keputusan maintainer.
