# Laporan — Deployment Documentation (B-02/Phase 0.3)

- **Task:** Phase 0.3 — Deployment Documentation (B-02)
- **Tanggal:** 12 November 2026
- **Repository:** `fahmiorim/appdes`
- **Branch:** `task/phase-0-deployment-documentation`
- **Base commit:** `d6f2a615d6a471b427ad35393250ba87f2aa3e05` (`origin/main`)
- **Commit dokumentasi:** `17f06152b3b7f980438dc173df67358c3193225c`
- **Status:** dokumentasi selesai; kesiapan deployment production **terhambat** oleh temuan UI/bootstrap di bawah.

## 1. Tujuan dan ruang lingkup

Tujuan task adalah menyediakan dokumentasi yang memungkinkan administrator
server memahami dan memasang aplikasi SID: persiapan server, environment,
database, migrasi, build, proses runtime, reverse proxy/HTTPS, domain
multi-tenant, backup/restore, dan operasi rutin.

Ruang lingkup pekerjaan **hanya dokumentasi**. Tidak ada perubahan pada:

- source code aplikasi;
- schema atau migration database;
- dependency;
- konfigurasi runtime;
- workflow CI;
- database production atau server deployment.

Dokumentasi disusun dari pembacaan kode dan konfigurasi aktual pada base commit,
bukan dari asumsi fitur. Jika implementasi belum tersedia, dokumen menuliskannya
sebagai keterbatasan dan tidak mengarang prosedur yang tidak dapat dijalankan.

## 2. Kondisi awal dan pendekatan

`origin/main` bergerak dari `c7c2ffc` ke `d6f2a61` sebelum branch dibuat.
Commit tersebut memuat Phase 0.1 (guard integration test) dan Phase 0.2 (CI).
Branch dokumentasi dibuat langsung dari `origin/main` terbaru agar tidak
membawa perubahan branch lama.

Pendekatan:

1. membaca `AGENTS.md`, roadmap, dan technical audit;
2. memeriksa konfigurasi Next.js/Drizzle/CI serta seluruh sumber environment;
3. menelusuri implementasi auth, tenant/domain, media, backup, dan restore;
4. menjalankan build dan quality gate pada base yang sama;
5. menulis dokumen dengan perintah yang hanya memakai tool/script yang ada;
6. menandai fitur yang tidak ditemukan sebagai temuan, bukan menutupinya.

## 3. Temuan utama sebelum dokumentasi

### 3.1 Tidak ada halaman UI pada snapshot `main`

Pemeriksaan:

```text
find src/app -type f -name 'page.tsx'   -> 0
find src/app -type f -name 'layout.tsx' -> 0
```

`src/app` hanya berisi route handler/API. `npm run build` berhasil (exit 0),
tetapi output build hanya memuat route API, bukan halaman login/dashboard.
Akibatnya dokumentasi tidak dapat memberikan prosedur login atau penggunaan
aplikasi lewat browser.

**Dampak:** instalasi dapat menjalankan proses API, tetapi belum dapat dipakai
sebagai SID oleh administrator desa.

### 3.2 Tidak ada bootstrap/seed tenant pertama

- `src/db/migrations/0000_baseline.sql` tidak memiliki satu pun `INSERT INTO`;
- tidak ditemukan file seed/bootstrap aplikasi;
- `provisioning-repository.ts` membutuhkan desa pertama sebagai cetakan;
- `requireSuperAdmin()` membutuhkan akun platform dengan `villageId === null`
  dan role `super-admin`;
- belum ada halaman/route provisioning untuk membuat Super Admin pertama.

**Dampak:** setelah `npm run db:migrate`, database berisi skema kosong tanpa
desa, role, admin, atau domain. Tidak ada jalur resmi dari repository untuk
mencapai login pertama. Ini adalah penghambat utama tujuan "siap dijalankan".

### 3.3 Backup aplikasi hanya database dan menampung dump di memori

`src/features/database/infrastructure/backup.ts` menjalankan `mysqldump`
(`--single-transaction --routines --triggers --events --hex-blob`) lalu
menampung seluruh output di `Buffer` sebelum dikirim. Tidak ada:

- backup media;
- penjadwalan/retensi/enkripsi/checksum;
- batas ukuran dump;
- backup otomatis sebelum restore.

Dokumentasi menyarankan backup CLI untuk database besar dan backup media
terpisah, bukan mengklaim fitur yang tidak ada.

### 3.4 Restore memiliki guardrail, tetapi bukan prosedur atomik

`src/app/api/database/restore/route.ts` dan
`src/features/database/application/database-use-cases.ts`:

- hanya Platform Super Admin;
- wajib `Content-Length`, maksimum 200 MB;
- hanya `.sql`/`.sql.gz`, satu berkas, field `konfirmasi=1`;
- mengalirkan isi ke `mysql`;
- memverifikasi keberadaan tujuh tabel wajib setelah restore;
- mencatat audit hanya setelah restore berhasil.

Tidak ada transaksi pembungkus, backup pre-restore otomatis, verifikasi isi
menyeluruh, atau restore media. Jika SQL gagal di tengah, database dapat
parsial. Restore juga memerlukan user database dengan hak DDL, yang bertentangan
dengan user runtime least-privilege jika dipisahkan.

### 3.5 Tidak ada artefak deployment tertentu di repository

Tidak ditemukan `Dockerfile`, `docker-compose.yml`, `ecosystem.config.js`
(PM2), `nginx.conf`, atau unit systemd. Dokumentasi memberikan contoh systemd
dan Nginx sebagai **template operasional**, dengan catatan bahwa itu bukan file
bawaan aplikasi.

### 3.6 Temuan pendukung

- `TTE_TIMEOUT` dibaca langsung dari `process.env` di
  `src/features/surat/domain/tte.ts`, tetapi tidak ada di `.env.example` dan
  tidak divalidasi skema Zod. Nilai non-angka dapat menghasilkan timeout tidak
  valid.
- `TTE_SSL=false` diterima dan disimpan parser, tetapi efeknya terhadap
  verifikasi TLS klien belum terbukti; dokumentasi melarang `false` untuk
  production dan meminta verifikasi runtime (terkait AUD-020).
- `APP_URL` divalidasi di `src/lib/env.ts`, tetapi pemakaian runtime yang
  ditemukan untuk baseURL/tautan reset adalah `BETTER_AUTH_URL`. Dokumentasi
  meminta keduanya disamakan; ini perlu dirapikan di implementasi.
- `emailAndPassword.enabled` aktif dan `disableSignUp` tidak diset eksplisit.
  Endpoint sign-up tidak boleh dianggap sebagai bootstrap admin; ini perlu
  ditinjau sebelum aplikasi diekspos publik.
- Tidak ada endpoint health khusus; dokumentasi memakai
  `GET /api/publik/openapi` yang benar-benar ada dan menyentuh database.
- CI `quality` dan `integration` ada di `.github/workflows/ci.yml`; tidak ada
  workflow deployment.

## 4. Dokumen yang dibuat

| File | Baris | Isi ringkas |
|---|---:|---|
| `docs/deployment/README.md` | 523 | Arsitektur, requirement server, instalasi, env, database, build/runtime, systemd, Nginx/HTTPS, domain, checklist, troubleshooting |
| `docs/deployment/ENVIRONMENT.md` | 262 | Semua variabel env aktual, fungsi, wajib/opsional, contoh fiktif, keamanan, rotasi |
| `docs/deployment/DATABASE.md` | 296 | MySQL 8.0, database/user, DSN, migrasi, environment, bootstrap yang belum ada, backup/restore, risiko |
| `docs/deployment/BACKUP-RESTORE.md` | 386 | Hak akses, format/batas backup, backup CLI+media, restore, verifikasi, recovery, audit |
| `docs/deployment/OPERATIONS.md` | 360 | Start/stop/restart, health check, log, DB, domain, storage, WhatsApp, maintenance, insiden |
| **Total** | **1.827** | Lima dokumen |

Tidak ada file source, schema, migration, dependency, CI, atau konfigurasi
runtime yang diubah.

## 5. File yang diperiksa

### Governance dan dokumen

- `AGENTS.md`
- `docs/MASTER_ROADMAP.md`
- `docs/TECHNICAL_AUDIT.md`
- `docs/SID_FEATURE_MAP.md` (grep relevansi)
- laporan baseline Phase 0.1/0.2 untuk konteks CI

### Konfigurasi

- `package.json`, `package-lock.json` (versi/script)
- `.env.example`
- `next.config.ts`
- `drizzle.config.ts`
- `tsconfig.json`
- `.gitignore`, `.prettierignore`
- `.github/workflows/ci.yml`
- `vitest.config.mts`, `vitest.integration.config.mts`
- `src/db/migrations/meta/_journal.json`, `src/db/migrations/0000_baseline.sql`

### Aplikasi dan domain

- `src/lib/env.ts`, `src/lib/auth.ts`, `src/lib/app-config.ts`,
  `src/lib/client-ip.ts`, `src/lib/logger.ts`, `src/lib/public-paths.ts`
- `src/proxy.ts`
- `src/db/index.ts`, `src/db/schema/village.ts`
- `src/features/desa/application/resolve-village.ts`,
  `src/features/desa/domain/tenant.ts`,
  `src/features/desa/domain/host.ts`,
  `src/features/desa/infrastructure/desa-repository.ts`
- `src/features/multi-desa/application/provisioning-use-cases.ts`,
  `src/features/multi-desa/infrastructure/provisioning-repository.ts`,
  `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`,
  `src/features/multi-desa/domain/desa-baru.ts`
- `src/features/publik/infrastructure/media-storage.ts`,
  `src/features/publik/domain/media.ts`,
  `src/features/publik/application/simpan-berkas-media.ts`
- `src/features/database/application/database-use-cases.ts`,
  `src/features/database/infrastructure/backup.ts`,
  `src/features/database/infrastructure/restore.ts`,
  `src/features/database/infrastructure/verifikasi-restore.ts`,
  `src/features/database/domain/database.ts`,
  `src/app/api/database/backup/route.ts`,
  `src/app/api/database/restore/route.ts`
- `src/features/notifikasi/infrastructure/whatsapp-baileys.ts`,
  `src/features/surat/domain/tte.ts`
- route referensi: `src/app/api/publik/openapi/route.ts`,
  `src/app/api/publik/informasi/route.ts`,
  `src/app/api/webhooks/email/route.ts`,
  `src/app/api/auth/[...all]/route.ts`

## 6. Ringkasan isi dokumen

### README

Menjelaskan arsitektur satu proses Node + MySQL + storage lokal + reverse proxy,
peringatan snapshot, requirement Node 22/MySQL 8.0, persiapan server, instalasi,
konfigurasi env, migrasi, build, contoh systemd, contoh Nginx/HTTPS, aturan
tenant/domain, checklist pasca-deploy, dan troubleshooting. Bagian bootstrap
secara eksplisit menyatakan belum tersedia.

### ENVIRONMENT

Mendokumentasikan 22 variabel yang ditemukan di source, termasuk variabel
wajib, opsional, TTE, WhatsApp, email, multi-desa, dan variabel test. Contoh
nilai seluruhnya fiktif/placeholder. Menjelaskan dampak rotasi secret dan
peringatan `TRUST_PROXY`/forwarded host.

### DATABASE

Membedakan development, testing, staging, production; menunjukkan pembuatan
database/user, grant, DSN, migrasi dengan `db:migrate`, larangan `db:push` di
production, ketiadaan rollback otomatis, bootstrap yang belum ada, strategi
backup, dan risiko kehilangan data.

### BACKUP-RESTORE

Membedakan backup DB aplikasi, backup CLI, dan media. Menjelaskan siapa yang
berwenang, format `.sql`/`.sql.gz`, batas 200 MB, field/HTTP restore, buffering
backup, audit, restore CLI, restore media, verifikasi tabel, dan recovery jika
restore gagal.

### OPERATIONS

Runbook start/stop/restart, health check, journal, koneksi MySQL, domain tenant,
disk/media, WhatsApp, pemeliharaan, rilis, insiden, dan monitoring minimum.
Semua perintah memakai stack aktual (systemd/Nginx hanya contoh).

## 7. Fakta implementasi yang diverifikasi

| Fakta | Bukti |
|---|---|
| Node minimum `>=20.9.0`; CI memakai Node 22 | `package.json`, `.github/workflows/ci.yml` |
| Next.js 16.4.2, `next start`, tanpa output standalone | `package.json`, `next.config.ts` |
| MySQL 8.0 di CI | service `mysql:8.0` |
| Satu migrasi baseline, 147 tabel, tanpa seed | `0000_baseline.sql`, `_journal.json` |
| Pool DB 10 koneksi | `src/db/index.ts` |
| Session 7 hari, cookie host-only | `src/lib/auth.ts` |
| Tenant dari `Host`/`X-Forwarded-Host` | `resolve-village.ts`, `tenant.ts`, `host.ts` |
| Wildcard `<slug>.<DESA_BASE_DOMAIN>`, fallback satu desa | `tenant.ts` |
| Media di `storage/media/<villageId>/<kategori>` | `media-storage.ts` |
| Batas media: gambar 5 MB, SVG 1 MB, PDF 20 MB | `media.ts` |
| Backup hanya DB, dump di memori, `mysqldump` | `backup.ts` |
| Restore maks. 200 MB, `.sql`/`.sql.gz`, 7 tabel wajib | `database.ts`, route restore, `verifikasi-restore.ts` |
| Backup/restore hanya Super Admin platform | `database-use-cases.ts`, `provisioning-use-cases.ts` |
| WhatsApp memakai Baileys dan folder sesi persisten | `whatsapp-baileys.ts` |
| TTE membaca `TTE_TIMEOUT` langsung dari `process.env` | `tte.ts` |
| CI quality + integration ada; tidak ada workflow deploy | `.github/workflows/ci.yml`, tree `.github` |

## 8. Validasi

Semua perintah dijalankan dari root repository pada branch ini, kecuali
dinyatakan lain. Tidak ada server production yang disentuh.

| Pemeriksaan | Perintah | Hasil | Bukti/ketentuan |
|---|---|---|---|
| Typecheck, lint, format, unit test | `npm run check` | **PASS** | 184 berkas, 1537 tes lulus; exit 0 |
| Build produksi | `npm run build` | **PASS** | exit 0; output hanya route API, tanpa halaman |
| Variabel env vs source | skrip Node ekstraksi `env.*`/`process.env.*` | **PASS** | 22/22 variabel source ditemukan di dokumentasi; tidak ada yang hilang |
| Perintah npm vs package.json | skrip Node pembanding | **PASS** | 7 perintah `npm run ...` yang dirujuk semuanya ada |
| Link internal Markdown | skrip Node pemeriksa path relatif | **PASS** | 5 dokumen deployment + laporan; tidak ada link lokal yang hilang |
| Pola secret | grep token/private key/password literal | **PASS** | Tidak ada credential nyata; hanya placeholder `GANTI_...` |
| Whitespace/error diff | `git diff --check` | **PASS** | Tidak ada output/error |
| Markdown linter khusus | — | **SKIPPED** | Tidak ada markdownlint di dependency/konfigurasi; Prettier mengabaikan `docs` dan `*.md` |
| Integration test | `npm run test:integration` | **SKIPPED** | Task hanya dokumentasi; tidak memakai database disposable pada validasi ini |
| CI run untuk branch ini | GitHub Actions | **SKIPPED** | Belum dijalankan saat laporan dibuat; workflow hanya diperiksa statis |

Catatan: `npm run build` dijalankan sebelum dokumen ditulis. Tidak ada source
yang berubah setelah build; `npm run check` dijalankan setelah dokumen selesai.
Lingkungan lokal memakai Node v26.2.0, sedangkan rekomendasi/CI memakai Node 22;
hasil build lokal tidak membuktikan kompatibilitas semua runtime.

## 9. Risiko dan keterbatasan

1. **Kesiapan produksi belum tercapai.** Tanpa halaman UI dan bootstrap,
   administrator tidak dapat login atau membuat tenant pertama. Dokumen tidak
   boleh dianggap sebagai bukti aplikasi siap produksi.
2. **Belum ada uji restore nyata.** Dokumentasi berisi prosedur, tetapi tidak
   ada restore drill ke database/staging dalam task dokumentasi ini.
3. **Belum ada deployment nyata.** Nginx, systemd, TLS, DNS, MySQL production,
   dan WhatsApp tidak dijalankan/diverifikasi.
4. **Backup belum otomatis.** RPO/RTO tidak ditetapkan atau diukur.
5. **Backup endpoint menampung seluruh dump di RAM.** Database besar berisiko
   OOM; gunakan CLI dan uji ukuran.
6. **Media tidak tercakup backup aplikasi.** Diperlukan prosedur operator
   terpisah dan uji konsistensi DB+media.
7. **Restore tidak atomik.** Kegagalan dapat meninggalkan database parsial.
8. **Hak akses restore bertentangan dengan least privilege** bila user runtime
   dipisahkan; gunakan user migrator/CLI dengan persetujuan.
9. **Temuan keamanan lama tetap berlaku**, termasuk TTE TLS opsional, ketergantungan
   pada forwarded host, dan media backup yang belum terverifikasi
   (AUD-015/AUD-019/AUD-020/AUD-021/AUD-029).
10. **Dokumentasi mengikuti snapshot.** Jika UI/bootstrap ditambahkan, bagian
    README/OPERATIONS/BACKUP harus diperbarui dan diuji ulang.

## 10. Kesimpulan

Dokumentasi deployment, environment, database, backup/restore, dan operasi telah
dibuat sesuai implementasi aktual dan sudah melewati quality gate repository.
Namun, berdasarkan snapshot ini aplikasi **belum dapat dinyatakan siap
di-deploy sebagai SID lengkap**: tidak ada halaman UI dan tidak ada jalur
bootstrap desa/admin pertama. Backup aplikasi juga belum mencakup media dan
belum memiliki penjadwalan/retensi.

Rekomendasi berikutnya (di luar scope dokumentasi ini):

1. sediakan bootstrap/template tenant pertama yang tidak bergantung pada desa
   sumber, beserta akun platform Super Admin;
2. sediakan halaman UI login/dashboard/provisioning;
3. tambahkan backup media terkoordinasi, checksum, retensi, dan restore drill;
4. pertimbangkan health endpoint serta monitoring/alert;
5. tinjau ulang dokumentasi setelah fitur-fitur tersebut tersedia.

## 11. Status penyerahan

- **Branch:** `task/phase-0-deployment-documentation`
- **Base:** `d6f2a615d6a471b427ad35393250ba87f2aa3e05`
- **Commit dokumentasi:** `17f06152b3b7f980438dc173df67358c3193225c`
- **File berubah:** 5 dokumen deployment + laporan ini; tidak ada source code.
- **Status:** siap review dokumentasi; **jangan merge/deploy** sebelum temuan
  UI/bootstrap dan backup media diselesaikan serta prosedur diuji di staging.
