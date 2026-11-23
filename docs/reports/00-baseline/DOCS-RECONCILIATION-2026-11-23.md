# Rekonsiliasi Dokumen Aktif dengan `origin/main` — 23 November 2026

- **Task:** menyelaraskan dokumen aktif dengan kode `origin/main`, tanpa mengubah source code, schema, atau migration.
- **Tanggal:** 23 November 2026.
- **Branch:** `task/docs-reconciliation`.
- **Base commit:** `2c86ec48ddff8c14e808f723b4c31cb6781de4872`.
- **Commit dokumen:** `1a0fbae1d9b10c03df8cd6eb607523812539c05d`.
- **Status:** siap review setelah commit dan push; belum merge.

## 1. Tujuan

Dokumen aktif di `docs/` masih memuat angka dan status dari 19 November 2026. Sejak itu route, template tenant, migration, dan test bertambah. Tujuan task ini adalah:

1. membandingkan klaim dokumen aktif dengan kode pada `origin/main`;
2. memperbarui klaim yang terbukti usang;
3. mempertahankan laporan historis dan rationale desain lama sebagai snapshot;
4. mencatat bukti, batas validasi, dan risiko yang tersisa.

Tidak ada source code, schema, migration, database, atau konfigurasi deployment yang diubah.

## 2. Ringkasan hasil

| Area | Klaim lama | Baseline 23 November 2026 | Bukti |
|---|---|---|---|
| Halaman dan route | 48 `page.tsx`; 19 halaman admin; 82 route handler; `RUTE_ADMIN_TERSEDIA` 16 entri | 149 `page.tsx`; 102 halaman di `(admin)` = 89 non-super-admin + 13 `/super-admin`; 115 route handler; `RUTE_ADMIN_TERSEDIA` 65 entri | `git ls-tree -r --name-only HEAD`; `menu-tampil.ts` |
| Migration | 16 migration, `0000`–`0015` | 52 berkas SQL dan 52 entri journal; nomor tidak kontigu; prefiks `0021` dipakai dua berkas; urutan journal tidak monoton | `src/db/migrations/*.sql`, `meta/_journal.json`, `migrasi-paritas.test.ts` |
| Template tenant | 4 role, 5 modul, 11 grant | 4 role, 23 modul, 62 grant (administrator 23; tiga role lain masing-masing 13), 8 menu publik | `src/db/templates/tenant-template.ts`; `template-tenant.test.ts` |
| Composite FK | 68 atau 74 constraint | 93 constraint `%_tenant_fk` yang diharapkan integration test | `src/db/tenant-composite-fk.integration.test.ts` |
| Integration test | 50 berkas; 53 test terpetakan | 56 berkas `*.integration.test.ts`; 59 test, 20 modul, 26 test lintas modul | `git ls-tree`; `node scripts/integration-test-map.mjs --check` |
| Inventaris repository | 1.307 file; 284 test; 79 schema | 1.732 file; 308 test; 95 schema | `git ls-tree -r --name-only HEAD` |
| Menu publik | `getNavPublik` dipakai 9 halaman | Dipakai 5 halaman: `/dokumen`, `/pengaduan`, `/pengaduan/baru`, `/pengaduan/berhasil`, `/pengaduan/lacak` | pencarian import dan pemanggilan `getNavPublik` |
| Domain | “verifikasi DNS/SSL belum ada” | Pemantauan DNS/SSL sudah ada dan terhubung ke `/super-admin/domain`; lifecycle verifikasi kepemilikan domain (challenge DNS/HTTP) belum ada | `pemantauan-domain-use-cases.ts`, `pemeriksa-dns.ts`, `pemeriksa-ssl.ts`, `super-admin/actions.ts`, halaman domain |
| Visual QA | “route lokal sama dengan job CI” | Skrip lokal 16 route; workflow CI 18 route publik + `/masuk` | `scripts/visual-qa/capture.mjs`; `.github/workflows/visual-qa.yml` |
| ADR mock BSrE | Menyebut service `tools/mock-bsre` | Tidak ada direktori `tools/` atau implementasi mock pada baseline | pencarian filesystem dan teks |
| Mockup | 126 aset | 126 PNG ter-track; 127 PNG lokal, satu berkas tidak ter-track | `git ls-tree`; `find docs/mockups` |
| Demo/reserved host | Belum tersedia | Tidak ditemukan implementasi `demo`/reserved host pada pencarian statis | pencarian `src/lib`, `src/features/multi-desa`, `super-admin` |

## 3. Metode

- Baseline kode: `git ls-tree -r --name-only HEAD` pada commit `2c86ec48`.
- Hitungan halaman, route handler, layout, direktori fitur, repository, application/use case, dan schema dilakukan dari daftar file tracked.
- Hitungan template dan route admin diverifikasi dengan AST TypeScript pada `tenant-template.ts` dan `menu-tampil.ts`, bukan hanya pencarian teks.
- Migration dihitung dari pasangan berkas SQL dan entri journal; paritas dijaga unit test.
- Pemakaian `getNavPublik` diverifikasi dari import dan pemanggilan di `src/app` dan `src/features`.
- Workflow Visual QA dibaca langsung dari `.github/workflows/visual-qa.yml`, termasuk trigger dan daftar route.
- Pencarian implementasi domain, demo/reserved host, dan mock BSrE dilakukan pada source, `tools/`, dan `package.json`.
- Tidak dilakukan pengujian runtime browser, DNS/SSL live, atau database MySQL.

## 4. Temuan penting

### 4.1 Migration tidak boleh dihitung dari nomor terakhir

Repository memiliki 52 berkas migration dan 52 entri journal, tetapi:

- nomor versi tidak kontigu;
- prefiks `0021` dipakai dua berkas (`0021_potensi_desa` dan `0021_data_kependudukan_menu`);
- urutan journal tidak monoton: `0026_website_desa_menu` diikuti `0021_data_kependudukan_menu`;
- tag terakhir adalah `0056_pendaftaran_warga`, sehingga menyimpulkan “52 migration” dari nomor terakhir akan salah.

Dokumen deployment sebelumnya menyebut 16 migration `0000`–`0015`. Angka itu sudah tidak berlaku. Prosedur deployment sekarang meminta operator memeriksa journal, bukan nomor terakhir.

### 4.2 Template tenant sudah jauh lebih luas, tetapi desain v1 tetap disimpan

Template kini memuat 23 modul dan 62 grant. `TENANT-TEMPLATE.md` dipertahankan sebagai dokumen desain v1: bagian §4–§5 menjelaskan alasan pemilihan modul dan target v2, bukan inventaris terkini. Header, fakta halaman, menu publik, dan tabel dampak diperbarui agar tidak menyesatkan; daftar modul/grant aktual tetap merujuk ke `tenant-template.ts` dan test.

### 4.3 Monitoring domain bukan verifikasi kepemilikan

Pemantauan DNS dan SSL sudah tersedia sebagai use case, infrastructure checker, Server Action, dan UI di `/super-admin/domain`, `/super-admin/domain/tambah`, serta `/super-admin/domain/[domainId]`. Yang belum ditemukan adalah lifecycle verifikasi kepemilikan domain, misalnya challenge DNS/HTTP. Karena itu dokumen sekarang membedakan:

- **monitoring DNS/SSL** — tersedia di aplikasi;
- **verifikasi kepemilikan custom domain** — belum tersedia;
- **konfigurasi DNS/TLS/reverse proxy deployment** — belum diverifikasi.

### 4.4 Menu publik hanya dipakai lima halaman

`getNavPublik` dipanggil oleh lima halaman: `/dokumen`, `/pengaduan`, `/pengaduan/baru`, `/pengaduan/berhasil`, dan `/pengaduan/lacak`. Halaman publik lain, termasuk beranda, berita, profil, agenda, layanan, dan kontak, masih menulis daftar tautannya sendiri. Ini adalah gap implementasi yang dicatat, bukan diperbaiki dalam task dokumentasi.

### 4.5 Visual QA lokal dan CI tidak identik

Skrip lokal mencakup 16 route publik. Workflow CI mencakup 18 route publik (menambahkan `/` dan `/berita`) plus `/masuk`, berjalan pada PR yang mengubah UI, dan dapat dijalankan manual. Dokumen sekarang menyebut perbedaan itu secara eksplisit.

### 4.6 ADR mock BSrE belum diterapkan

`ADR-001-mock-bsre-provider.md` tetap berlaku sebagai keputusan rancangan, tetapi tidak ada direktori `tools/` maupun service `tools/mock-bsre` pada baseline. Status implementasi ditambahkan agar ADR tidak dibaca sebagai bukti kode tersedia.

## 5. File yang diperiksa

Dokumen aktif dan sumber kode utama:

- `docs/README.md`, `docs/reports/README.md`
- `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`
- `docs/architecture/MODULE-INVENTORY.md`
- `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md`
- `docs/deployment/README.md`, `docs/deployment/DATABASE.md`, `docs/deployment/STAGING.md`
- `docs/design/ADMIN-PLATFORM-DESIGN.md`, `docs/design/DESIGN-SYSTEM.md`
- `docs/design/TENANT-TEMPLATE.md`, `docs/design/README.md`
- `docs/testing/INTEGRATION-TEST-MAP.md`, `docs/testing/TENANT-ISOLATION-MATRIX.md`, `docs/testing/VISUAL-QA-LOCAL.md`
- `docs/decisions/ADR-001-mock-bsre-provider.md`
- `src/db/templates/tenant-template.ts`
- `src/features/multi-desa/domain/template-tenant.ts`
- `src/features/multi-desa/domain/template-tenant.test.ts`
- `src/features/navigation/domain/menu-tampil.ts`
- `src/db/tenant-composite-fk.integration.test.ts`
- `src/db/migrasi-paritas.test.ts`
- `src/db/migrations/meta/_journal.json`
- `src/features/multi-desa/application/pemantauan-domain-use-cases.ts`
- `src/features/multi-desa/infrastructure/pemeriksa-dns.ts`
- `src/features/multi-desa/infrastructure/pemeriksa-ssl.ts`
- `src/app/(admin)/super-admin/domain/**`
- `scripts/visual-qa/capture.mjs`, `.github/workflows/visual-qa.yml`

## 6. File yang diubah

| File | Alasan |
|---|---|
| `docs/TECHNICAL_AUDIT.md` | Inventaris 23 November, migration 52, composite FK 93, dan batas validasi integration test |
| `docs/SID_FEATURE_MAP.md` | Cakupan UI 23 November, route 65, template 23/62, dan pemisahan mockup dari status route |
| `docs/MASTER_ROADMAP.md` | Baseline route/template terbaru dan status domain monitoring vs verifikasi |
| `docs/architecture/MODULE-INVENTORY.md` | Regenerasi inventaris untuk `2c86ec48`; rincian 89 + 13 halaman dan 65 route admin |
| `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` | Baseline rekonsiliasi, status UI, dan pemisahan monitoring DNS/SSL dari verifikasi kepemilikan |
| `docs/deployment/README.md` | Migration 52, peringatan nomor tidak kontigu, dan template 23/62 |
| `docs/deployment/DATABASE.md` | Migration 52 dan template 23/62 |
| `docs/deployment/STAGING.md` | Checklist migrasi memakai jumlah journal, bukan nomor terakhir |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | Status domain: pemantauan DNS/SSL ada, verifikasi kepemilikan belum |
| `docs/design/DESIGN-SYSTEM.md` | Audit struktur repository 23 November dan istilah area menu |
| `docs/design/TENANT-TEMPLATE.md` | Penanda snapshot desain v1, template 23/62, menu publik 5 halaman, dan tabel dampak |
| `docs/design/README.md` | Membedakan snapshot audit 19 November dari inventaris route 23 November |
| `docs/testing/TENANT-ISOLATION-MATRIX.md` | Daftar 93 composite FK dan batas validasi |
| `docs/testing/VISUAL-QA-LOCAL.md` | Perbedaan 16 route lokal vs 18 route CI + login |
| `docs/decisions/ADR-001-mock-bsre-provider.md` | Status implementasi: belum ada `tools/mock-bsre` |
| `docs/reports/README.md` | Indeks laporan rekonsiliasi dan koreksi label “terkini” pada laporan historis |
| `docs/reports/00-baseline/DOCS-RECONCILIATION-2026-11-23.md` | Laporan ini |

Laporan `docs/reports/03-core-sid/PR-219-CI-RETRIGGER-2026-11-23.md` memiliki perubahan lokal yang sudah ada sebelum task ini dan **tidak** termasuk perubahan task; file itu tidak disentuh.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run src/db/migrasi-paritas.test.ts src/features/multi-desa/domain/template-tenant.test.ts` | **PASS** — 2 file, 32 test lulus |
| `node scripts/integration-test-map.mjs --check` | **PASS** — 59 test, 20 modul, 26 test lintas modul |
| `npx prettier --check <17 file dokumen yang diubah>` | **PASS** — seluruh file memakai format Prettier |
| Pemeriksaan tautan relatif pada 17 dokumen | **PASS** — semua tautan relatif yang diperiksa ada |
| `npm run test:integration` | **SKIPPED** — tidak dijalankan; tidak ada database MySQL disposable yang diverifikasi pada task dokumentasi ini |
| `npm run typecheck`, `npm run lint`, `npm run build` | **SKIPPED** — tidak ada source code, schema, atau migration yang diubah |

Test unit di atas membaca file migration dan template, bukan database. Kelulusannya tidak membuktikan 93 composite FK terpasang pada database nyata.

## 8. Risiko dan keterbatasan

- **Composite FK 93 belum diuji runtime.** Angka 93 adalah ekspektasi test integration; kelulusan terakhir yang tercatat adalah 68 constraint pada MySQL disposable (17 November 2026). Perlu dijalankan ulang pada database disposable sebelum diklaim lulus.
- **Domain hanya diverifikasi statis.** Pemantauan DNS/SSL belum diuji terhadap provider DNS atau sertifikat nyata; verifikasi kepemilikan domain tetap belum tersedia.
- **Angka inventaris bersifat snapshot.** Route, template, dan test dapat berubah setelah commit ini. Dokumen harus diperbarui bila kontraknya berubah.
- **Desain v1 tidak ditulis ulang seluruhnya.** `TENANT-TEMPLATE.md` mempertahankan rationale lama dengan penanda snapshot; pembaca harus memakai `tenant-template.ts` untuk daftar modul/grant aktual.
- **Gap menu publik tidak diperbaiki.** Hanya lima halaman memakai `getNavPublik`; ini dicatat sebagai risiko produk/implementasi, bukan diubah dalam task dokumentasi.
- **Satu aset mockup lokal tidak ter-track.** Ada 127 PNG di filesystem, 126 di Git; laporan memakai 126 sebagai baseline repository. Berkas lokal tambahan tidak dimasukkan ke commit.
- **Tidak ada pemeriksaan tautan otomatis khusus dokumentasi.** Validasi format dan tautan relatif baru dilakukan secara terbatas; CI dokumentasi tersendiri belum ada.

## 9. Revisi 2 — verifikasi lanjutan dan pembersihan (23 November 2026)

Revisi ini memeriksa ulang klaim yang masih tersisa setelah rekonsiliasi pertama. Repository sudah disinkronkan dengan remote: `origin/main` berada di `2c86ec48` dan branch ini satu commit di depannya. Branch `main` lokal memakai riwayat lama yang berbeda (724 commit tidak ada di `origin/main`); branch itu tidak diubah.

### 9.1 Klaim usang yang ditemukan dan diperbaiki

| Dokumen | Klaim lama | Kondisi kode | Bukti |
|---|---|---|---|
| `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md` | `upsertKeuanganBatch` belum memakai kunci `(desa, tahun)`, sehingga impor bersamaan dengan simpan manual masih dapat membuat induk tidak konsisten | Impor memanggil `saveKeuanganNilai`, jalur yang sama dengan simpan manual: kunci MySQL, transaksi, dan agregasi ulang induk; ada integration test konkurensi | `src/features/keuangan/infrastructure/keuangan-repository.ts:288-300`; `src/features/keuangan/infrastructure/apbdes-import-concurrency.integration.test.ts` |
| `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`, `docs/design/ADMIN-PLATFORM-DESIGN.md` | Editor/katalog template belum ada; `/super-admin/template` baca-saja | Katalog template dapat dibuat, diubah, diubah statusnya, dan didistribusikan ke tenant; ada riwayat versi dan audit | `src/app/(admin)/super-admin/template/actions.ts`; `src/features/multi-desa/application/template-website-use-cases.ts`; `src/db/schema/website-templates.ts` |
| `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md` | Pemilihan tema belum ada UI dan tabel `theme` hanya diisi seed provisioning | Tenant memilih template terbit pada tab Tampilan `/pengaturan-desa`; distribusi versi memperbarui baris `theme` tenant | `src/app/(admin)/pengaturan-desa/settings-client.tsx:727-767`; `src/features/multi-desa/infrastructure/template-website-repository.ts:300-320` |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` §4 | Sidebar desa hanya memuat Beranda, Data Penduduk, dan Pengaturan; Administrasi Surat belum punya modul/grant | Template memuat 23 modul, termasuk website desa, administrasi surat, permohonan surat, pemerintahan desa, dan wilayah; Administrasi Surat sudah punya grant | `src/db/templates/tenant-template.ts`; `src/features/multi-desa/domain/template-tenant.test.ts` |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` §4 | Konsol Super Admin memiliki tujuh halaman dan halaman Template masih baca-saja | Ada 13 halaman `page.tsx` dalam tujuh area; halaman Template interaktif, hanya Pengaturan yang baca-saja | `git ls-files 'src/app/(admin)/super-admin/**/page.tsx'`; `src/app/(admin)/super-admin/template/[templateId]/page.tsx` |
| `docs/design/ADMIN-DESA-SCREEN-SPEC.md` | Lima halaman baca-saja belum memiliki modul/grant, termasuk Administrasi Surat; dokumen tampil sebagai status aktif | Snapshot 19 November: Administrasi Surat sudah mendapat modul/grant; dokumen sekarang diberi penanda historis dan rujukan status terbaru | `src/db/templates/tenant-template.ts`; `docs/SID_FEATURE_MAP.md` |
| `docs/SID_FEATURE_MAP.md` baris Auth & RBAC | Belum menyebut 2FA staf desa, riwayat kata sandi, dan kebijakan keamanan desa | Ketiganya sudah ada; MFA tetap belum tersedia untuk akun platform (`village_id IS NULL`) | `src/lib/auth.ts` (`twoFactor` plugin); `src/app/(admin)/pengaturan/pengguna/keamanan/**`; migration `0053`–`0055` |

Angka inventaris yang direkonsiliasi pada revisi pertama diverifikasi ulang dan tetap sama: 149 `page.tsx` (102 di `(admin)`: 89 non-super-admin + 13 `/super-admin`), 115 route handler, 57 direktori fitur, 89 repository, 113 berkas application non-test, 34 berkas `"use server"`, 52 migration dan 52 entri journal, 23 modul/62 grant/4 role/8 menu publik, 65 entri `RUTE_ADMIN_TERSEDIA`, 56 berkas integration test, 308 berkas test, 95 berkas schema, dan 126 PNG mockup ter-track.

### 9.2 Dokumen yang dihapus

Dihapus karena sudah digantikan, tidak memiliki rujukan masuk, dan isinya menduplikasi laporan yang lebih baru. Riwayat lengkap tetap tersedia di Git:

| Berkas | Alasan |
|---|---|
| `docs/reports/00-baseline/DOKUMEN-KONSISTENSI-PERBAIKAN-2026-11-19.md` | Proses perbaikan dokumen 19 November; digantikan laporan rekonsiliasi ini; 0 rujukan |
| `docs/reports/00-baseline/FEATURE-MAP-STATUS-CORRECTION-2026-11-19.md` | Koreksi status peta fitur 19 November; angka dan statusnya sudah usang; 0 rujukan |
| `docs/reports/00-baseline/TECHNICAL-AUDIT-STATUS-CORRECTIONS-2026-11-19.md` | Penerapan koreksi status yang sudah tercakup di `TECHNICAL_AUDIT.md` dan laporan ini; 0 rujukan |
| `docs/reports/00-baseline/DOKUMENTASI-REORGANISASI-2026-11-18.md` | Catatan reorganisasi 18 November; aturan strukturnya sudah ada di `docs/README.md`; 0 rujukan |
| `docs/reports/01-security/TENANT-ISOLATION-HARDENING-2026-11-20.md` | Digantikan revisi 2 pada hari yang sama (`...-REV2.md`); 0 rujukan |
| `docs/reports/01-security/ADR-001-mock-bsre-provider.md` | Salinan laporan dari branch lama; keputusan kanonik ada di `docs/decisions/ADR-001-mock-bsre-provider.md`; rujukan di `ARSIP-DOKUMEN-AUDIT.md` diperbarui |

Laporan historis lain, termasuk AUD, rollback, dan bukti CI, tetap disimpan sebagai jejak audit. Laporan itu tidak dijadikan acuan status terbaru.

### 9.3 Validasi revisi 2

| Perintah | Hasil |
|---|---|
| `npx prettier --check docs/MASTER_ROADMAP.md docs/SID_FEATURE_MAP.md docs/design/ADMIN-DESA-SCREEN-SPEC.md docs/design/ADMIN-PLATFORM-DESIGN.md docs/reports/00-baseline/ARSIP-DOKUMEN-AUDIT.md docs/reports/00-baseline/DOCS-RECONCILIATION-2026-11-23.md docs/reports/README.md` | **PASS** |
| Pemeriksaan tautan relatif dan keberadaan berkas rujukan pada dokumen yang diubah | **PASS** |
| `npm run test:integration` | **SKIPPED** — tidak ada database MySQL disposable yang diverifikasi; tidak ada kode yang berubah |
| `npm run typecheck`, `npm run lint`, `npm run build` | **SKIPPED** — hanya dokumentasi yang berubah |

### 9.4 Sisa ketidakpastian

- Verifikasi template, tema, dan 2FA dilakukan secara statis dari route, Server Action, use case, dan schema; belum ada walkthrough browser pada tenant baru.
- Distribusi template ke tenant dan pemilihan tema belum diuji pada database MySQL disposable dalam revisi ini.
- Status 93 composite FK, domain DNS/SSL, dan backup media tetap seperti revisi pertama: belum diuji runtime pada task dokumentasi.

## 10. Kesimpulan dan rekomendasi

Dokumen aktif sekarang memakai baseline `2c86ec48` untuk angka inventaris, membedakan monitoring domain dari verifikasi kepemilikan, dan tidak lagi menyebut 16 migration atau template 5 modul/11 grant. Laporan historis tetap menjadi snapshot.

Rekomendasi berikutnya:

1. Jalankan integration test pada database MySQL disposable untuk memverifikasi 93 composite FK.
2. Tinjau apakah gap `getNavPublik` (5 halaman) perlu diperbaiki atau cukup dicatat sebagai keterbatasan produk.
3. Pertimbangkan pemeriksaan otomatis jumlah route/template agar dokumen tidak kembali menyimpang.
4. Verifikasi template 23 modul dan 62 grant terhadap kebutuhan onboarding tenant nyata sebelum dipakai di staging.
