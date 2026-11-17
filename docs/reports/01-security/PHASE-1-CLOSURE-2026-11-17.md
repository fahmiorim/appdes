# Laporan Penutupan Fase 1 — Tenant Isolation dan Security Hardening

- **Task:** audit penutupan Fase 1 — status implementasi, bukti, dan blocker.
- **Tanggal:** 17 November 2026.
- **Branch:** `docs/phase-1-closure-2026-11-17`.
- **Base commit:** `47a17e72b79c789b0dc26eb52394ac4d1d3d814a` (`main`).
- **Jenis pekerjaan:** dokumentasi/audit read-only; tidak ada perubahan kode, schema, migration, konfigurasi, atau data.
- **Status:** **Fase 1 belum ditutup; belum production-ready.**
- **Acuan:** `docs/MASTER_ROADMAP.md` §3 Fase 1, `docs/TECHNICAL_AUDIT.md`, laporan di `docs/reports/01-security/`, dan schema/migration `src/db/`.

## 1. Ringkasan eksekutif

Hampir seluruh deliverable kode dan schema Fase 1 sudah di-merge ke `main`.
Pemeriksaan statis menunjukkan migration `0001`–`0011` sudah tersedia,
test integration mengharapkan **68 constraint `%_tenant_fk`**, dan peta
integration test mencatat **47 test pada 20 modul** beserta **21 test lintas
modul**.

Pada 17 November 2026, migration tersebut juga dijalankan pada **MySQL 8.0.30
disposable dari Laragon**. Hasilnya: **12 migration tercatat, 148 tabel, 68
constraint `%_tenant_fk`**, seluruh **47 suite / 253 integration test lulus**,
build production lulus, dan smoke test lokal merespons HTTP 200. Bukti ini
menutup pertanyaan “apakah migration dapat berjalan dari nol”, tetapi **belum
menutup blocker staging/production** karena tidak memakai data legacy
representatif, reverse proxy, domain, atau provider eksternal.

Namun Fase 1 **belum dapat ditutup** karena tiga hal:

1. Migration `0001`–`0011` belum memiliki bukti dijalankan pada staging atau
   production. Preflight data nyata, backup, pengukuran lock, dan smoke test
   dua tenant pada deployment nyata belum tercatat.
2. Integrasi eksternal TTE dan webhook email baru terbukti pada level kode dan
   regression test. Provider nyata, egress, reverse proxy, dan konfigurasi
   staging belum diverifikasi.
3. Masih ada relasi yang dijaga application layer saja: `users.role_id` dan
   empat tabel anak tanpa `village_id` (`survey_soal`, `survey_responden`,
   `survey_jawaban`, `pembangunan_dokumentasi`).

Karena itu status yang benar adalah **selesai di repository, belum selesai
secara operasional**. Fase 1 belum boleh ditandai selesai hanya berdasarkan
merge PR.

## 2. Metode dan batas

Pemeriksaan dilakukan dengan:

1. Membaca kriteria Fase 1 pada `docs/MASTER_ROADMAP.md`.
2. Membaca temuan dan kontrol positif pada `docs/TECHNICAL_AUDIT.md`.
3. Membaca laporan security, migration, rollback, dan review tenant di
   `docs/reports/01-security/`.
4. Memeriksa daftar migration `src/db/migrations/0000`–`0011`.
5. Memeriksa daftar constraint yang diharapkan oleh
   `src/db/tenant-composite-fk.integration.test.ts`.
6. Menjalankan validator peta integration test.
7. Memeriksa riwayat PR dan status merge pada repository/API.
8. Membuat database disposable `desa_test_phase1_20261117` dan database staging
   lokal `sid_staging_local` pada MySQL 8.0.30 Laragon.
9. Menerapkan seluruh migration pada kedua database dan memeriksa journal,
   jumlah tabel, serta constraint `%_tenant_fk`.
10. Menjalankan integration suite, build production, dan smoke test HTTP lokal.

Tidak ada database production atau staging eksternal yang disentuh. Database
pengembangan `desa_dev` juga tidak digunakan. Kesimpulan tentang database
production/staging eksternal tetap **tidak dapat diverifikasi dari
repository** dan dicatat sebagai blocker, bukan sebagai PASS.

## 3. Status per item Fase 1

| Item roadmap | Status | Bukti dan catatan |
| --- | --- | --- |
| Validasi `role.villageId` terhadap `users.villageId`; pengecualian platform Super Admin eksplisit | **Selesai di kode** | AUD-001 dan PR #33. `ensureRoleExists` menolak role desa lain/role platform; RBAC memakai konteks tenant. Keputusan `users.role_id` didokumentasikan di `docs/decisions/ADR-002-users-role-id-app-enforced.md`. |
| Audit foreign reference penduduk, keluarga, RTM, KIA, surat, kelompok, bantuan, inventaris | **Selesai di kode untuk modul prioritas** | AUD-003, AUD-004, AUD-005, AUD-006, AUD-025, Bantuan, DTKS/Suplemen, dan Inventaris sudah merged. Validasi application layer dan composite FK menjadi lapisan berlapis. |
| Composite unique dan composite FK untuk relasi tenant-scoped | **Selesai di schema; terverifikasi di MySQL lokal; belum di database target** | Migration `0001`–`0011` tersedia dan berhasil diterapkan pada MySQL 8.0.30 disposable/staging lokal: 12 migration, 68 `%_tenant_fk`. Batch B1 (delapan relasi `SET NULL`) masuk melalui PR #84. |
| Join/agregasi keluarga dan penduduk menyertakan `villageId` | **Selesai di kode** | AUD-011/AUD-012; join DTKS/Suplemen dan repository penduduk/keluarga dibatasi tenant. |
| Keamanan TTE: origin allowlist, redirect, private/link-local/metadata, TLS | **Selesai di kode dan test; belum diuji ke provider nyata** | PR #2. Test menolak URL lintas origin, redirect, IP internal, dan memaksa TLS. BSrE nyata, egress firewall, dan DNS/TLS staging belum diuji. Aktivasi produksi tetap berada di Fase 6. |
| Webhook email: forwarded host dan binding credential | **Selesai di kode dan regression test; konfigurasi deployment belum diverifikasi** | PR #24. Webhook memakai HMAC, timestamp, event ID, dan hanya `Host`; `X-Forwarded-Host` tidak menjadi sumber tenant. Provider dan reverse proxy aktual belum diuji. |
| Cabut sesi admin desa saat reset password | **Selesai di kode** | PR #41; `revokeSessionsOnPasswordReset: true`, `cookieCache` dimatikan, dan reset platform menghapus sesi user sasaran dalam transaksi. Uji runtime MySQL dan sesi lintas instance belum menjadi bukti tersendiri. |
| Test dua tenant untuk baca, tulis, import, export | **Selesai di CI dan lokal** | Peta integration test: 47 test, 20 modul, 21 test lintas modul. CI MySQL 8 dan run lokal pada MySQL 8.0.30 sama-sama lulus; run lokal memakai database disposable terpisah. |

## 4. Kriteria selesai roadmap

| Kriteria | Penilaian | Dasar |
| --- | --- | --- |
| Use case tidak dapat menyimpan relasi lintas tenant | **Terpenuhi dengan pengecualian** | Validasi aplikasi dan composite FK tersedia untuk modul prioritas. `users.role_id` tetap app-enforced; empat tabel anak tanpa `village_id` mengandalkan parent/application layer. |
| TTE tidak mengirim Authorization ke host yang tidak disetujui | **Terpenuhi di kode/test** | Test origin, redirect, dan pemisahan URL unduhan lulus. Provider nyata belum diuji. |
| Reset password membatalkan sesi lama | **Terpenuhi di kode** | Sesi dihapus untuk user sasaran; cookie cache dimatikan. Belum ada uji runtime MySQL khusus untuk skenario ini. |
| Test isolasi tenant lulus untuk modul prioritas | **Terpenuhi di CI dan lokal** | 47 integration test pada peta; CI MySQL 8 lulus pada PR terkait, dan 47/47 suite (253 test) lulus pada MySQL 8.0.30 lokal. |

## 5. Blocker penutupan Fase 1

### B1 — Migration belum diterapkan dan diuji pada staging/production

Ini blocker utama. Repository memiliki migration, dan migration tersebut sudah
berhasil diterapkan pada database kosong lokal. Namun belum ada bukti preflight,
backup, pengukuran lock/downtime, deployment bertahap, atau smoke test dua
tenant pada database target yang berisi data legacy. DDL composite FK juga
dapat gagal bila data lama berisi referensi orphan atau lintas tenant.

Yang harus tersedia sebelum status berubah:

- Salinan data staging yang representatif dan sudah dianonimisasi.
- Preflight read-only untuk setiap relasi yang mendapat composite FK.
- Backup database dan media yang dapat direstore.
- Hasil pengukuran lock/downtime untuk `ALTER TABLE`.
- Bukti migration `0001`–`0011` berhasil dari baseline sampai versi terbaru.
- Smoke test dua tenant setelah migration.
- Rehearsal rollback pada salinan terverifikasi, termasuk `0011`.

### B2 — Validasi integrasi eksternal belum dilakukan

TTE dan webhook email sudah diperkuat pada level kode, tetapi belum ada bukti:

- koneksi ke BSrE nyata atau environment resmi;
- egress policy yang membatasi tujuan keluar;
- perilaku provider terhadap allowlist, redirect, dan sertifikat;
- provider email mengirim HMAC/timestamp/event ID sesuai kontrak baru;
- reverse proxy staging mempertahankan `Host` tenant dan tidak meneruskan
  `X-Forwarded-Host` sebagai identitas tenant.

Tanpa bukti ini, hardening belum dapat disebut tervalidasi end-to-end.
Aktivasi TTE produksi memang berada di Fase 6, tetapi risiko integrasinya tetap
perlu dicatat sebagai risiko Fase 1 yang belum tertutup.

### B3 — Sisa enforcement tenant di application layer

Dua kelompok berikut tetap menjadi keputusan/risiko yang harus eksplisit:

1. **`users.role_id`** — sengaja tidak dijadikan composite FK karena role
   platform yang sah memiliki `village_id IS NULL`. Enforcement berada di
   use case/repository RBAC. Keputusan ini sudah dicatat di ADR-002, tetapi
   tidak memberi jaminan database terhadap writer SQL baru atau operasi manual.
2. **Empat tabel anak tanpa `village_id`** — `survey_soal`,
   `survey_responden`, `survey_jawaban`, dan `pembangunan_dokumentasi`.
   Isolasinya bergantung pada parent dan application layer; composite FK
   memerlukan kolom baru dan backfill, sehingga membutuhkan keputusan
   maintainer.

### B4 — Bukti operasional staging belum tersedia

Laporan Fase 0 mencatat bahwa deployment staging live dan dump database staging
belum dibuat karena tidak ada akses environment. Pada 17 November 2026 sudah
ada **staging lokal** di MySQL 8.0.30 Laragon untuk migration, build, dan smoke
test HTTP. Namun staging tersebut tidak memiliki domain publik, reverse proxy,
provider TTE, atau provider webhook. Jadi belum ada lingkungan eksternal untuk
memverifikasi bootstrap tenant, callback, dan konfigurasi deployment nyata.

### B5 — Rollback tersedia, tetapi belum menjadi bukti operasional

Rollback `0011` sudah diport ke `main` melalui PR #102. Rollback `0007`–`0009`
dan `0010` juga tercatat. Namun belum ada rollback yang dijalankan pada
staging/produksi, dan skrip bersifat manual, tidak atomik, serta tidak
idempotent. Ketersediaan skrip tidak sama dengan pemulihan yang sudah teruji.

### B6 — Dokumentasi status sebelumnya tidak seragam

Beberapa laporan per-AUD masih menyebut “siap review” atau “belum merged”
walaupun pekerjaannya sudah masuk `main`. Laporan ini menjadi baseline status
Fase 1 per 17 November 2026; laporan lama tetap menjadi snapshot historis.

## 6. Bukti yang sudah tersedia

- Migration `src/db/migrations/0001_aud002_composite_tenant_fk.sql` sampai
  `0011_b1_set_null_relations_composite_fk.sql`.
- Daftar harapan **68 constraint `%_tenant_fk`** pada
  `src/db/tenant-composite-fk.integration.test.ts`.
- Peta integration test: **47 test, 20 modul, 21 test lintas modul**
  (`scripts/integration-test-map.json`).
- Rollback `0011`: `docs/reports/01-security/AUD-034-b1-rollback.sql` dan
  laporannya, sudah di `main` melalui PR #102.
- Kontrol sesi: `src/lib/auth.ts` dan
  `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`.
- Kontrol TTE: `src/features/surat/domain/tte-jaringan.ts`,
  `src/features/surat/infrastructure/tte-https.ts`.
- Kontrol webhook: `src/app/api/webhooks/email/route.ts` dan test route.
- Keputusan `users.role_id`:
  `docs/decisions/ADR-002-users-role-id-app-enforced.md`.
- Validasi lokal 17 November 2026: MySQL 8.0.30 Laragon, database disposable
  `desa_test_phase1_20261117` dan `sid_staging_local`; 12 migration, 148 tabel,
  68 `%_tenant_fk`, 47/47 suite integration, build production, dan smoke test
  `/api/publik/openapi` serta `/masuk`.

## 7. Validasi yang dijalankan

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Status working tree dan branch | `git status --short --branch` | **PASS** — branch task dari `main`; hanya laporan ini yang berubah |
| Base commit | `git log -1 --format='%H %s'` | **PASS** — `47a17e7` |
| Validator peta integration test | `node scripts/integration-test-map.mjs --check` | **PASS** — 47 test, 20 modul, 21 test lintas modul |
| Jumlah constraint yang diharapkan | Pemeriksaan Node pada `tenant-composite-fk.integration.test.ts` | **PASS** — 68 nama unik `%_tenant_fk` |
| Keberadaan rollback `0011` | `ls docs/reports/01-security/AUD-034-b1-rollback.*` | **PASS** — Markdown dan SQL ada |
| Migration pada database disposable | `npm run db:migrate` dengan `DATABASE_URL` ke `sid_staging_local` | **PASS** — 12 migration tercatat, 148 tabel |
| Constraint aktual di database | Query `INFORMATION_SCHEMA` | **PASS** — 68 constraint `%_tenant_fk` |
| Integration suite penuh | `node node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts --hookTimeout=300000 --testTimeout=300000` | **PASS** — 47/47 suite, 253/253 test, 169,87 detik |
| Suite rollback B2 | Perintah Vitest yang sama, difilter ke `b2-migration-guard-rollback.integration.test.ts` | **PASS** — 5/5 test |
| Runner integration repository | `npm run test:integration:ci` | **FAIL** — `spawnSync ... vitest.cmd EINVAL` pada Windows/Node 26.2.0; bukan kegagalan database/test |
| Build production | `npm run build` | **PASS** — dengan warning tracing dinamis WhatsApp Baileys |
| Smoke test OpenAPI | `curl /api/publik/openapi` pada server lokal port 3100 | **PASS** — HTTP 200 |
| Smoke test halaman masuk | `curl /masuk` pada server lokal port 3100 | **PASS** — HTTP 200 |
| Format laporan | `npx prettier --check docs/reports/01-security/PHASE-1-CLOSURE-2026-11-17.md` | **PASS** |
| Whitespace diff | `git diff --check` | **PASS** |
| Typecheck/lint/unit test terpisah | — | **SKIPPED** — build menjalankan TypeScript; unit test terpisah tidak dijalankan karena tidak ada source code berubah |
| Preflight dan rollback `0011` pada data legacy | — | **NOT TESTED** — database lokal kosong, bukan salinan data target |
| Deployment staging eksternal / TTE nyata / webhook provider | — | **NOT TESTED** — tidak ada domain, reverse proxy, atau kredensial non-production |

## 8. Risiko dan keterbatasan

- **Risiko data legacy:** migration composite FK dapat gagal bila ada child
  yatim atau lintas tenant. Preflight wajib dilakukan pada salinan data nyata.
- **Risiko DDL:** `ALTER TABLE` composite FK dapat mengambil lock dan
  memperpanjang deployment; durasinya belum diukur pada volume production.
- **Risiko rollback:** rollback bersifat manual dan tidak atomik; kegagalan di
  tengah jalan memerlukan rekonsiliasi `information_schema`.
- **Risiko integrasi:** TTE dan webhook belum diuji dengan provider/proxy nyata;
  keberhasilan unit/route test tidak membuktikan konfigurasi deployment.
- **Risiko enforcement:** `users.role_id` dan empat tabel anak tanpa
  `village_id` tidak memiliki jaminan database penuh.
- **Keterbatasan bukti:** migration, integration test, build, dan smoke test
  sudah dijalankan secara lokal, tetapi database lokal kosong dan tidak
  merepresentasikan data legacy, volume, atau konfigurasi target.
- **Keterbatasan staging lokal:** server lokal tidak memiliki domain publik,
  TLS, reverse proxy tenant, atau koneksi provider; callback dan TTE tidak
  dapat diverifikasi end-to-end.
- **Masalah runner:** `npm run test:integration:ci` gagal di Windows/Node 26
  karena `spawnSync` tidak dapat menjalankan `vitest.cmd`. Suite lulus saat
  Vitest dijalankan langsung, tetapi perbaikan runner belum termasuk task ini.
- **Warning build:** tracing dinamis direktori autentikasi WhatsApp membuat
  seluruh proyek ikut ditrace; ini warning deployment, bukan kegagalan build.

## 9. Kesimpulan dan rekomendasi

**Fase 1 belum ditutup.** Kode dan schema hardening sudah hampir lengkap.
Migration, integration suite, build, dan smoke test sudah terbukti pada database
lokal kosong, tetapi belum ada bukti yang cukup pada staging/production dengan
data legacy dan konfigurasi deployment nyata.

Urutan yang direkomendasikan:

1. Siapkan staging eksternal terisolasi, domain/TLS, dan salinan data yang aman.
2. Jalankan preflight read-only untuk seluruh relasi composite FK pada salinan
   data tersebut.
3. Buat backup database dan media; ukur lock/downtime pada volume yang
   representatif.
4. Terapkan migration `0001`–`0011` di staging dengan data legacy dan verifikasi
   68 constraint; bukti lokal saja tidak menutup blocker ini.
5. Jalankan smoke test dua tenant pada deployment staging untuk baca, tulis,
   import, export, dan hapus.
6. Uji rollback `0011` pada salinan terverifikasi; rollback suite B2 di database
   kosong bukan bukti pemulihan data target.
7. Verifikasi TTE dan webhook pada konfigurasi staging/provider yang sebenarnya.
8. Catat keputusan formal untuk `users.role_id` dan empat tabel anak tanpa
   `village_id`.
9. Setelah semua bukti tersedia, perbarui laporan ini dan tandai Fase 1 selesai.

Jangan memulai Fase 2 dengan asumsi Fase 1 sudah selesai hanya karena PR sudah
merged. Pekerjaan Fase 2 yang tidak bergantung pada deployment boleh disiapkan,
tetapi gate P0 tetap harus diselesaikan sebelum status fase berubah.

## 10. Status penyerahan

**Siap review.** Laporan ini hanya dokumentasi; tidak ada perubahan kode,
schema, migration, konfigurasi deployment, atau data. Validasi lokal memakai
database disposable dan staging lokal terpisah; database pengembangan dan
production tidak disentuh. Belum ada merge atau deploy pada task ini.
