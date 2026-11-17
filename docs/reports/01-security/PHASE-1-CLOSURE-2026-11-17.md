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

Namun Fase 1 **belum dapat ditutup** karena tiga hal:

1. Migration `0001`–`0011` belum memiliki bukti dijalankan pada staging atau
   production. Preflight data nyata, backup, pengukuran lock, dan smoke test
   dua tenant belum tercatat.
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

Tidak ada database yang dijalankan, tidak ada migration yang diterapkan, dan
tidak ada test integration yang dijalankan pada task ini. Semua kesimpulan
tentang database production/staging adalah **tidak dapat diverifikasi dari
repository** dan dicatat sebagai blocker, bukan sebagai PASS.

## 3. Status per item Fase 1

| Item roadmap | Status | Bukti dan catatan |
| --- | --- | --- |
| Validasi `role.villageId` terhadap `users.villageId`; pengecualian platform Super Admin eksplisit | **Selesai di kode** | AUD-001 dan PR #33. `ensureRoleExists` menolak role desa lain/role platform; RBAC memakai konteks tenant. Keputusan `users.role_id` didokumentasikan di `docs/decisions/ADR-002-users-role-id-app-enforced.md`. |
| Audit foreign reference penduduk, keluarga, RTM, KIA, surat, kelompok, bantuan, inventaris | **Selesai di kode untuk modul prioritas** | AUD-003, AUD-004, AUD-005, AUD-006, AUD-025, Bantuan, DTKS/Suplemen, dan Inventaris sudah merged. Validasi application layer dan composite FK menjadi lapisan berlapis. |
| Composite unique dan composite FK untuk relasi tenant-scoped | **Selesai di schema; belum diverifikasi di database target** | Migration `0001`–`0011` tersedia. Test mengharapkan 68 `%_tenant_fk`. Batch B1 (delapan relasi `SET NULL`) masuk melalui PR #84. |
| Join/agregasi keluarga dan penduduk menyertakan `villageId` | **Selesai di kode** | AUD-011/AUD-012; join DTKS/Suplemen dan repository penduduk/keluarga dibatasi tenant. |
| Keamanan TTE: origin allowlist, redirect, private/link-local/metadata, TLS | **Selesai di kode dan test; belum diuji ke provider nyata** | PR #2. Test menolak URL lintas origin, redirect, IP internal, dan memaksa TLS. BSrE nyata, egress firewall, dan DNS/TLS staging belum diuji. Aktivasi produksi tetap berada di Fase 6. |
| Webhook email: forwarded host dan binding credential | **Selesai di kode dan regression test; konfigurasi deployment belum diverifikasi** | PR #24. Webhook memakai HMAC, timestamp, event ID, dan hanya `Host`; `X-Forwarded-Host` tidak menjadi sumber tenant. Provider dan reverse proxy aktual belum diuji. |
| Cabut sesi admin desa saat reset password | **Selesai di kode** | PR #41; `revokeSessionsOnPasswordReset: true`, `cookieCache` dimatikan, dan reset platform menghapus sesi user sasaran dalam transaksi. Uji runtime MySQL dan sesi lintas instance belum menjadi bukti tersendiri. |
| Test dua tenant untuk baca, tulis, import, export | **Selesai di CI** | Peta integration test: 47 test, 20 modul, 21 test lintas modul. CI MySQL 8 menjadi bukti utama; integration lokal tidak tersedia pada environment ini. |

## 4. Kriteria selesai roadmap

| Kriteria | Penilaian | Dasar |
| --- | --- | --- |
| Use case tidak dapat menyimpan relasi lintas tenant | **Terpenuhi dengan pengecualian** | Validasi aplikasi dan composite FK tersedia untuk modul prioritas. `users.role_id` tetap app-enforced; empat tabel anak tanpa `village_id` mengandalkan parent/application layer. |
| TTE tidak mengirim Authorization ke host yang tidak disetujui | **Terpenuhi di kode/test** | Test origin, redirect, dan pemisahan URL unduhan lulus. Provider nyata belum diuji. |
| Reset password membatalkan sesi lama | **Terpenuhi di kode** | Sesi dihapus untuk user sasaran; cookie cache dimatikan. Belum ada uji runtime MySQL khusus untuk skenario ini. |
| Test isolasi tenant lulus untuk modul prioritas | **Terpenuhi di CI** | 47 integration test pada peta; CI MySQL 8 lulus pada PR terkait. |

## 5. Blocker penutupan Fase 1

### B1 — Migration belum diterapkan dan diuji pada staging/production

Ini blocker utama. Repository memiliki migration, tetapi tidak ada bukti
preflight, backup, pengukuran lock/downtime, deployment bertahap, atau smoke
test dua tenant pada database target. DDL composite FK juga dapat gagal bila
data lama berisi referensi orphan atau lintas tenant.

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
belum dibuat karena tidak ada akses environment. Kondisi itu belum berubah.
Akibatnya tidak ada lingkungan nyata untuk memverifikasi bootstrap tenant,
migration, TTE, webhook, dan smoke test dua tenant.

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

## 7. Validasi yang dijalankan

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Status working tree dan branch | `git status --short --branch` | **PASS** — bersih, branch task dari `main` |
| Base commit | `git log -1 --format='%H %s'` | **PASS** — `47a17e7` |
| Validator peta integration test | `node scripts/integration-test-map.mjs --check` | **PASS** — 47 test, 20 modul, 21 test lintas modul |
| Jumlah constraint yang diharapkan | Pemeriksaan Node pada `tenant-composite-fk.integration.test.ts` | **PASS** — 68 nama unik `%_tenant_fk` |
| Keberadaan rollback `0011` | `ls docs/reports/01-security/AUD-034-b1-rollback.*` | **PASS** — Markdown dan SQL ada |
| Format laporan | `npx prettier --check docs/reports/01-security/PHASE-1-CLOSURE-2026-11-17.md` | **PASS** |
| Whitespace diff | `git diff --check` | **PASS** |
| Typecheck/lint/unit test | — | **SKIPPED** — hanya Markdown; tidak ada source code berubah |
| Integration test MySQL | — | **SKIPPED** — tidak ada perubahan schema/kode; database disposable tidak tersedia |
| Build | — | **SKIPPED** — tidak ada perubahan aplikasi |
| Deployment staging / TTE nyata / webhook provider | — | **NOT TESTED** — tidak ada akses environment |

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
- **Keterbatasan bukti:** laporan ini tidak menjalankan database, migration,
  atau integration test; status database target tidak dapat dipastikan dari
  repository.

## 9. Kesimpulan dan rekomendasi

**Fase 1 belum ditutup.** Kode dan schema hardening sudah hampir lengkap dan
layak dilanjutkan ke validasi operasional, tetapi belum ada bukti yang cukup
untuk menyebut fase ini selesai atau production-ready.

Urutan yang direkomendasikan:

1. Siapkan staging terisolasi dan salinan data yang aman.
2. Jalankan preflight read-only untuk seluruh relasi composite FK.
3. Buat backup database dan media; ukur lock/downtime.
4. Terapkan migration `0001`–`0011` di staging dan verifikasi 68 constraint.
5. Jalankan smoke test dua tenant untuk baca, tulis, import, export, dan hapus.
6. Uji rollback `0011` pada salinan terverifikasi.
7. Verifikasi TTE dan webhook pada konfigurasi staging/provider yang sebenarnya.
8. Catat keputusan formal untuk `users.role_id` dan empat tabel anak tanpa
   `village_id`.
9. Setelah semua bukti tersedia, perbarui laporan ini dan tandai Fase 1 selesai.

Jangan memulai Fase 2 dengan asumsi Fase 1 sudah selesai hanya karena PR sudah
merged. Pekerjaan Fase 2 yang tidak bergantung pada deployment boleh disiapkan,
tetapi gate P0 tetap harus diselesaikan sebelum status fase berubah.

## 10. Status penyerahan

**Siap review.** Laporan ini hanya dokumentasi; tidak ada perubahan kode,
schema, migration, konfigurasi deployment, atau data. Belum ada merge atau
deploy pada task ini.
