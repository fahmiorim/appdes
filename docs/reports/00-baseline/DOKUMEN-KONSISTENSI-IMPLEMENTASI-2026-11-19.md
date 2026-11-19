# Audit Konsistensi Dokumentasi terhadap Implementasi — 19 November 2026

- **Task:** memeriksa apakah dokumentasi aktif relevan dan berkesinambungan, lalu mencocokkan klaimnya dengan implementasi pada `origin/main`.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/docs-consistency-implementation-audit`, dibuat dari `origin/main`.
- **Base commit:** `58347a6d3a2b89070b2483aed343e441842447de` (`Merge pull request #156`).
- **Jenis task:** audit **read-only**. Tidak ada perubahan source, schema, migration, konfigurasi, atau data. Satu-satunya berkas baru adalah laporan ini.
- **Status:** selesai — siap review.

## 1. Tujuan dan batas

Audit ini menjawab dua pertanyaan:

1. Apakah dokumen di `docs/` masih relevan satu sama lain, atau saling bertentangan karena diperbarui pada waktu berbeda?
2. Apakah klaim status/angka di dokumen aktif masih cocok dengan kode yang benar-benar ada di `origin/main`?

Batas:

- Semua klaim diuji secara **statis** dari working tree pada base commit di atas. Tidak ada aplikasi yang dijalankan, browser, database, staging, atau provider eksternal.
- Laporan di `docs/reports/` diperlakukan sebagai **snapshot**. Laporan lama tidak dicap salah hanya karena kode berubah setelah tanggalnya; yang dinilai adalah apakah dokumen **aktif** (akar `docs/`, `architecture/`, `design/`, `deployment/`, `testing/`, `mockups/`) masih memakai klaim yang sudah tidak berlaku, dan apakah dokumen aktif masih menunjuk laporan snapshot sebagai status terkini tanpa keterangan.
- Tidak ada perbaikan dokumentasi yang dikerjakan dalam task ini. Rekomendasi perbaikan dicatat di §8 agar bisa dipecah menjadi task terpisah sesuai aturan satu-task-satu-perubahan.

## 2. Metode

- Ref pembanding: `origin/main` pada `58347a6`; `HEAD` branch ini adalah commit yang sama.
- Hitungan file memakai `git ls-files` dan `node` agar hanya berkas terlacak yang dihitung.
- Pemeriksaan tautan relatif memakai skrip Node yang membaca 160 berkas Markdown di `docs/` (blok kode diabaikan) dan memeriksa keberadaan target di filesystem.
- Perbandingan variabel environment memakai ekstraksi nama kunci dari `src/lib/env.ts`, lalu mencocokkannya dengan tabel di `docs/deployment/ENVIRONMENT.md` dan `.env.example`.
- Peta integration test divalidasi dengan validator repository sendiri (`node scripts/integration-test-map.mjs --check`), bukan hanya dibaca.
- Setiap temuan di §5 sudah dicek langsung pada berkas kode yang disebut, bukan disimpulkan dari judul laporan.

## 3. Ringkasan eksekutif

Dokumentasi repository ini **secara struktur sehat**: ada indeks dokumen aktif vs snapshot (`docs/README.md`), katalog laporan (`docs/reports/README.md`), dan seluruh 160 berkas Markdown tidak memiliki tautan relatif yang rusak. Katalog mockup juga konsisten (89 aset = 21 publik + 11 akun + 7 pendukung + 40 platform + 10 Admin Desa).

Namun **kesinambungan isinya belum terjaga**. Sepuluh temuan pada dokumen aktif sudah bertentangan dengan kode `origin/main`, dan salah satunya adalah pertentangan di dalam satu dokumen yang sama. Pola utamanya sama: pekerjaan Admin Desa pada 19 November (halaman penduduk, pengguna, grup akses, keuangan, konten, persuratan, pengaduan; migrasi `0013`–`0015`; template tenant 4 role/5 modul; navigasi publik berbasis `menu_publik`) tidak diikuti pembaruan dokumen status, deployment, dan desain.

Dampak paling nyata ada pada dua area:

- **Operasional deployment:** tiga dokumen masih menyatakan 13 migrasi, padahal journal berisi 16. Checklist staging akan tampak gagal bagi operator yang menghitung berkas.
- **Konfigurasi keamanan TTE:** referensi environment masih mendokumentasikan `TTE_SSL` yang sudah dihapus, tetapi tidak mencantumkan `TTE_ALLOWED_HOSTS` yang sekarang menjadi kontrol wajib (fail-closed).

## 4. Fakta pembanding (diukur pada `58347a6`)

| Item | Nilai terukur | Perintah/bukti |
|---|---:|---|
| Berkas `page.tsx` seluruh aplikasi | 45 | `git ls-files 'src/app/**/page.tsx' \| wc -l` |
| Berkas `page.tsx` di `src/app/(admin)` | 17 (16 statis + 1 detail dinamis) | `git ls-files 'src/app/(admin)/**/page.tsx'` |
| Halaman Admin Desa | 10 | beranda, penduduk, penduduk/[id], keuangan, konten/berita, konten/galeri, persuratan/surat, pengaduan-admin, pengaturan/pengguna, pengaturan/grup-akses |
| Halaman konsol Super Admin | 7 | `src/app/(admin)/super-admin/**/page.tsx` |
| Entri `RUTE_ADMIN_TERSEDIA` | 16 | `src/features/navigation/domain/menu-tampil.ts` |
| Route handler `route.ts` | 82 | `git ls-files 'src/app/**/route.ts' \| wc -l` |
| Migration SQL / entri journal | 16 / 16 (`0000`–`0015`) | `git ls-files 'src/db/migrations/*.sql'`, `_journal.json` |
| Berkas schema | 79 | `git ls-files 'src/db/schema/*.ts'` |
| Berkas berisi `"use server"` | 6 | `grep -RIl '^"use server"' src` |
| Mockup PNG terlacak | 89 | `git ls-files 'docs/mockups/**/*.png'` |
| Integration test terpetakan | 53 test, 20 modul, 21 lintas modul | `node scripts/integration-test-map.mjs --check` → **PASS** |
| Halaman publik yang memanggil `getNavPublik` | 9 | `grep -RIl getNavPublik src/app --include='*.tsx'` |
| Isi `TENANT_TEMPLATE` | 4 role, 5 modul, 11 grant, 8 menu publik, tema `esensi` | `src/db/templates/tenant-template.ts` |
| `TTE_ALLOWED_HOSTS` | Ada di `src/lib/env.ts`; tidak ada di `docs/deployment/ENVIRONMENT.md` | perbandingan kunci env |
| `TTE_SSL` | Tidak ada di skema env; diabaikan `parseKonfigTte`; tetap didokumentasikan sebagai variabel | `src/lib/env.ts:99`, `src/features/surat/domain/tte.ts:179` |

Rincian halaman Admin Desa: `/beranda`, `/penduduk`, `/penduduk/[id]`, `/keuangan`, `/konten/berita`, `/konten/galeri`, `/persuratan/surat`, `/pengaduan-admin`, `/pengaturan/pengguna`, `/pengaturan/grup-akses`. Halaman-halaman ini tersedia di sidebar karena `RUTE_ADMIN_TERSEDIA` dan modul tenant mencantumkannya (`src/db/migrations/0014_menu_pengguna_grup_akses.sql`, `0015_menu_penduduk.sql`).

Kedalaman UI berbeda-beda dan tidak boleh dilebih-lebihkan: `penduduk` punya filter/paginasi/detail, `pengguna` dan `grup-akses` punya Server Action, sedangkan `keuangan`, `konten/berita`, `konten/galeri`, `persuratan/surat`, dan `pengaduan-admin` masih berupa daftar baca-saja tanpa form.

## 5. Temuan

Prioritas: **P1** = menyesatkan operasi/keamanan; **P2** = status produk salah dan dipakai untuk perencanaan; **P3** = inkonsistensi internal/tautan acuan.

| ID | Prioritas | Dokumen | Klaim yang tidak lagi berlaku | Bukti kode | Dampak |
|---|---|---|---|---|---|
| DOK-01 | P1 | `docs/deployment/ENVIRONMENT.md:209-217,294` | `TTE_SSL` masih didokumentasikan sebagai opsi TLS; efeknya "belum terbukti" | `TTE_SSL` tidak ada di skema `src/lib/env.ts`; `parseKonfigTte` tidak membacanya; `tte-https.ts` tidak menyediakan opsi mematikan verifikasi; test `tte.test.ts:158-161` menegaskan flag diabaikan. `TTE_ALLOWED_HOSTS` ada di `src/lib/env.ts:98` dan `tte.ts:255-277` tetapi **tidak muncul sama sekali** di `docs/deployment/` | Operator dapat mengira TLS bisa dimatikan lewat env, dan tidak diberi tahu bahwa allowlist provider wajib diisi; bila kosong, semua provider TTE ditolak (fail-closed) |
| DOK-02 | P1 | `docs/deployment/README.md:257`, `docs/deployment/DATABASE.md:138,248`, `docs/deployment/STAGING.md:117` | "Repository saat ini memiliki 13 migrasi" dan "Template bawaan masih minimal (hanya role `administrator`), karena katalog halaman admin saat ini baru `/beranda`" | 16 migration (`0000`–`0015`) dan 16 entri journal; `TENANT_TEMPLATE` berisi 4 role, 5 modul, 11 grant | Checklist staging meminta operator memverifikasi angka yang salah; deskripsi template menyesatkan tentang hasil provisioning tenant baru |
| DOK-03 | P2 | `docs/SID_FEATURE_MAP.md:13` (dan nada serupa di `:29`) | "UI pengelolaan modul SID **belum tersedia**"; "halaman admin hanya delapan path"; "modul SID lain hanya memiliki route handler ekspor, PDF, atau berkas" | 17 berkas `page.tsx` admin, 16 entri `RUTE_ADMIN_TERSEDIA`, 10 halaman Admin Desa (lihat §4); `pengguna`/`grup-akses` memakai Server Action | Peta fitur adalah dokumen acuan utama; klaim ini membuat pekerjaan yang sudah ada terlihat belum dimulai dan menyembunyikan batas yang sebenarnya (CRUD/import/grafik belum ada) |
| DOK-04 | P2 | `docs/design/TENANT-TEMPLATE.md:30,33,122,126-130,216-220,238` | Hanya `/beranda` halaman admin desa (8 berkas); modul template hanya `beranda`; tenant baru mendapat "4 role, 1 modul, 4 grant"; integration test memverifikasi "1 modul (`beranda`), matriks grant yang diharapkan"; `menu_publik` belum dibaca situs publik | Template: 5 modul (`beranda`, `penduduk`, `pengaturan` grup, `pengguna`, `grup-akses`) dan 11 grant; 9 halaman publik memanggil `getNavPublik`; test provisioning membandingkan modul dengan `TENANT_TEMPLATE` dan hanya mengassert grant `beranda`, bukan seluruh matriks | Dokumen desain template menjadi dasar keputusan v2; angka dan asumsi navigasinya sudah salah, dan klaim cakupan test lebih luas daripada assertion sebenarnya |
| DOK-05 | P2 | `docs/design/ADMIN-PLATFORM-DESIGN.md:7,123` (klaim status implementasi; §1 sendiri adalah target) | "§1 dan implementasi saat ini memakai sidebar putih dan aksi biru"; "Admin sidebar desa saat ini baru menampilkan Beranda" | Topbar memang masih putih (`.admin-topbar` di `globals.css:473`), tetapi sidebar desa sudah memakai override `[data-desa="true"]` (`globals.css:3370-3425`): latar navy `#0b1c3b`, item aktif ungu. `AdminTopbar` memuat breadcrumb; sidebar merender Beranda + modul tenant (penduduk, grup Pengaturan, pengguna, grup akses) | Dokumen sudah jujur bahwa §1/§3 belum selaras dengan mockup, tetapi bagian yang mengklaim **kondisi implementasi saat ini** sudah tidak akurat; keputusan produk yang masih terbuka menjadi sulit dinilai |
| DOK-06 | P2 | `docs/architecture/MODULE-INVENTORY.md:4-10` | Inventaris dari `f5a6f42`: 36 halaman, 81 route handler, 8 halaman admin | 45 halaman, 82 route handler, 17 halaman admin; tabel route tidak memuat 9 route Admin Desa yang ada (`/penduduk`, `/penduduk/[id]`, `/keuangan`, `/konten/berita`, `/konten/galeri`, `/persuratan/surat`, `/pengaduan-admin`, `/pengaturan/pengguna`, `/pengaturan/grup-akses`) | Dokumen ini disebut sebagai inventaris faktual dan ditautkan dari peta fitur; selisihnya membuat pembaca menyimpulkan modul tersebut tidak punya halaman |
| DOK-07 | P3 | `docs/testing/INTEGRATION-TEST-MAP.md:9,56` | Ringkasan "53 integration test", tetapi kebijakan fail-safe menyebut "**Seluruh 47 test**" | Validator repository: 53 test, 20 modul, 21 lintas modul (`--check` PASS) | Dokumen bertentangan dengan dirinya sendiri; angka 47 juga tidak cocok dengan suite yang dijalankan CI |
| DOK-08 | P3 | `docs/mockups/README.md:152` | "status implementasi mengikuti audit final" | Audit final adalah snapshot 42 mockup (18 November); dokumen yang sama (`:5`) menyatakan audit itu tidak mencakup 37 dari 38 layar Super Admin, dan paragraf pembuka menyebut tiga acuan terpisah | Aturan pemakaian menunjuk sumber yang sudah dinyatakan historis oleh dokumen lain |
| DOK-09 | P3 | `docs/reports/README.md:25`; `docs/design/README.md:13-19` | Review mockup Admin Desa (base `204b91a`) disebut "Acuan terkini untuk area desa" untuk status "10 layar Admin Desa" | Review itu (`:33`) menyatakan 9 dari 10 layar belum punya halaman; laporan `03-core-sid/ADMIN-PENDUDUK-2026-11-19.md` dan `ADMIN-PENGGUNA-HAK-AKSES-2026-11-19.md` mencatat halaman penduduk serta pengguna/grup akses sudah dibuat, dan keduanya sudah ada di `main`. Review sendiri punya catatan delta untuk shell (`:121`), tetapi tidak untuk 9 halaman | Pembaca tidak punya penanda bahwa laporan review sudah disusul implementasi; ini masalah kesinambungan, bukan kesalahan laporan historisnya |
| DOK-10 | P3 | `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md:28` | "Rute `/admin` pada hostname tenant adalah area Admin Desa" | Tidak ada `page.tsx` di path `/admin`; area admin desa memakai `/beranda`, `/penduduk`, dan seterusnya | Bila ini target arsitektur, perlu dilabeli target; bila dibaca sebagai implementasi, path-nya tidak ada |

### 5.1 Catatan tambahan

- `docs/MASTER_ROADMAP.md:135` dan `docs/SID_FEATURE_MAP.md:29` masih meminta "tinjau template bawaan yang masih minimal". Template sekarang lebih lengkap, tetapi tetap lebih kecil dari seluruh modul SID. Kalimat ini tidak salah secara teknis, namun sebaiknya menyebut isi aktual (4 role/5 modul) agar tidak dibaca sebagai "hanya administrator".
- `docs/TECHNICAL_AUDIT.md:39-40` dan `docs/design/DESIGN-SYSTEM.md:233` memakai angka lama, tetapi sudah diberi tanggal ("per 18 November 2026", "Baseline 18 November 2026"). Ini **bukan** temuan; keduanya adalah snapshot berlabel dan tidak boleh ditulis ulang seolah kondisi sekarang.
- `docs/deployment/README.md:10-28` juga memakai blok "Status snapshot repository" bertanggal commit `f19267d`. Angka 29 `page.tsx` di dalam blok itu dapat diterima sebagai snapshot. Yang menjadi temuan DOK-02 adalah kalimat "Repository saat ini memiliki 13 migrasi" di luar blok snapshot.

## 6. Yang sudah konsisten (kontrol positif)

| Aspek | Bukti |
|---|---|
| Pemisahan dokumen aktif vs snapshot | `docs/README.md` mendefinisikan aktif, snapshot, dan arsip; `docs/reports/README.md` mengulang aturan yang sama |
| Tautan relatif | 160 berkas Markdown diperiksa; **0** tautan relatif menunjuk target yang tidak ada |
| Katalog mockup | 89 aset dan rincian 21/11/7/40/10 konsisten antara `docs/README.md`, `docs/mockups/README.md`, dan `docs/design/DESIGN-SYSTEM.md` |
| Peta integration test (header) | Angka 53/20/21 cocok dengan validator repository dan dengan laporan CI #156 |
| Klaim TTE di dokumen audit teknis | `TECHNICAL_AUDIT.md:104` (AUD-020) sudah menyatakan `TTE_SSL` dihapus dan TLS tidak dapat dimatikan — sesuai kode |
| Status Super Admin | Tujuh halaman konsol pada `SID_FEATURE_MAP.md`, `ADMIN-PLATFORM-DESIGN.md`, dan `TECHNICAL_AUDIT.md` cocok dengan 7 `page.tsx` |
| Kebijakan laporan | Laporan lama dipertahankan dan tidak ditulis ulang; laporan baru memakai nama bertanggal |

## 7. Penilaian kesinambungan

1. **Struktur dokumentasi: baik.** Indeks, aturan arsip, dan katalog laporan berfungsi; tidak ada tautan mati.
2. **Sinkronisasi status: lemah.** Tidak ada mekanisme yang memaksa dokumen status ikut berubah ketika halaman, migration, template, atau konfigurasi berubah. `docs:inventory` sudah tersedia tetapi inventaris di repository masih dari commit 18 November, dan peta integration test tidak diregenerasi setelah suite bertambah.
3. **Pola kegagalan berulang.** Audit klaim 18 November memperbaiki angka dan status saat itu; pekerjaan 19 November menambah 9 route, 3 migration, dan mengubah template, tetapi dokumen yang sama tidak diperbarui lagi. Ini bukan masalah satu dokumen, melainkan tidak adanya gate.
4. **Snapshot vs acuan tercampur di titik masuk.** `docs/design/README.md` dan `docs/reports/README.md` menyebut laporan review mockup sebagai acuan "terkini" untuk status implementasi, padahal laporan itu secara eksplisit adalah snapshot pada base commit yang lebih lama.

## 8. Rekomendasi (belum dikerjakan)

Urutan yang disarankan, satu task per butir agar diff mudah direview:

1. **DOK-01:** perbarui `docs/deployment/ENVIRONMENT.md` — hapus `TTE_SSL` dari tabel dan contoh `.env`, tambahkan `TTE_ALLOWED_HOSTS` beserta sifat fail-closed dan format host:port.
2. **DOK-02:** perbarui angka migration menjadi 16 (`0000`–`0015`) di `README.md`, `DATABASE.md`, dan checklist `STAGING.md`; perbaiki deskripsi template di `DATABASE.md:248`.
3. **DOK-03/04/05:** selaraskan `SID_FEATURE_MAP.md`, `TENANT-TEMPLATE.md`, dan `ADMIN-PLATFORM-DESIGN.md` dengan 17 halaman admin, 5 modul template, 11 grant, dan navigasi publik berbasis `menu_publik`. Nyatakan batas UI secara eksplisit: halaman baca-saja vs halaman dengan aksi tulis.
4. **DOK-06:** regenerasi inventaris dengan `npm run docs:inventory` pada `origin/main`, lalu review diff.
5. **DOK-07:** regenerasi `docs/testing/INTEGRATION-TEST-MAP.md` dengan `node scripts/integration-test-map.mjs --markdown`, atau perbaiki angka fail-safe menjadi 53.
6. **DOK-08/09:** tambahkan catatan delta pada `docs/design/README.md` dan `docs/mockups/README.md` yang menunjuk laporan implementasi terbaru, tanpa mengubah laporan snapshot.
7. **DOK-10:** beri label "target" pada rute `/admin`, atau ganti dengan path yang benar-benar dipakai (`/beranda` dan modul admin desa).
8. **Pencegahan:** pertimbangkan langkah CI yang menjalankan `node scripts/integration-test-map.mjs --check` (sudah ada) dan pemeriksaan kesegaran inventaris, serta pemeriksaan tautan Markdown. Ini memerlukan keputusan maintainer karena menyentuh CI, jadi tidak dikerjakan dalam audit ini.

## 9. Validasi

Semua perintah dijalankan dari root repository pada branch ini, tanpa database dan tanpa aplikasi berjalan.

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Branch dan base commit | `git status --short --branch`, `git rev-parse HEAD` | **PASS** — branch `task/docs-consistency-implementation-audit`, base `58347a6` |
| Hitungan halaman dan route | `git ls-files 'src/app/**/page.tsx' \| wc -l`, `git ls-files 'src/app/**/route.ts' \| wc -l`, `git ls-files 'src/app/(admin)/**/page.tsx'` | **PASS** — 45 halaman, 82 route handler, 17 halaman admin |
| Route admin tersedia | `sed -n '/RUTE_ADMIN_TERSEDIA/,/^];/p' src/features/navigation/domain/menu-tampil.ts` | **PASS** — 16 entri |
| Migration | `git ls-files 'src/db/migrations/*.sql' \| wc -l`; entri `_journal.json` | **PASS** — 16/16 |
| Isi template tenant | pembacaan `src/db/templates/tenant-template.ts`; hitungan `roleSlug` pada blok `akses` | **PASS** — 4 role, 5 modul, 11 grant |
| Peta integration test | `node scripts/integration-test-map.mjs --check` | **PASS** — 53 test, 20 modul, 21 lintas modul |
| Ringkasan peta (pembanding) | `node scripts/integration-test-map.mjs --markdown \| head -3` | **PASS** — generator menyatakan 53, bukan 47 |
| Tautan relatif dokumentasi | skrip Node atas 160 berkas Markdown `docs/` | **PASS** — 0 target hilang |
| Variabel environment vs dokumentasi | skrip Node pembanding `src/lib/env.ts`, `ENVIRONMENT.md`, `.env.example` | **FAIL (temuan)** — `TTE_ALLOWED_HOSTS` tidak terdokumentasi; `TTE_SSL` terdokumentasi tetapi tidak ada di skema |
| Navigasi publik | `grep -RIl getNavPublik src/app --include='*.tsx'` | **PASS** — 9 halaman memakai `menu_publik` |
| Format laporan | `npx prettier --check docs/reports/00-baseline/DOKUMEN-KONSISTENSI-IMPLEMENTASI-2026-11-19.md` | **PASS** — "All matched files use Prettier code style" (exit 0) |
| Typecheck/lint/unit/integration/build | Tidak dijalankan | **SKIPPED** — tidak ada perubahan kode; audit statis |
| Browser/visual acceptance | Tidak dijalankan | **SKIPPED** — di luar scope audit dokumentasi |

## 10. Risiko dan keterbatasan

- Semua temuan berbasis kode pada satu commit (`58347a6`). Bila dokumen diperbarui di branch lain yang belum di-merge, sebagian temuan bisa hilang tanpa terlihat di sini.
- Audit tidak menjalankan aplikasi, sehingga tidak memverifikasi perilaku runtime halaman admin (mis. apakah setiap halaman benar-benar dapat dibuka dengan permission yang ada). Yang diverifikasi adalah keberadaan file, route, dan pemeriksaan izin pada level kode.
- Tidak ada pengujian kontras, aksesibilitas, atau visual terhadap mockup. Klaim desain di §5 hanya menilai kesesuaian teks dokumen dengan kode CSS/komponen.
- Angka halaman dapat berubah bila PR lain menambah route setelah commit ini.
- Temuan DOK-10 bisa jadi merupakan **target arsitektur** yang disengaja, bukan klaim implementasi. Karena dokumen tidak melabelinya sebagai target, temuan tetap dicatat sebagai ambiguitas yang perlu diperjelas.
- Laporan ini tidak mengubah dokumen lain, sehingga kontradiksi di §5 masih ada sampai task perbaikan dikerjakan.

## 11. Kesimpulan

Dokumentasi Appdes **relevan secara struktur, tetapi belum berkesinambungan secara isi**. Dari 160 berkas Markdown, tidak ada tautan rusak, dan pemisahan snapshot/aktif sudah didefinisikan dengan baik. Namun dokumen aktif yang dipakai untuk operasi, perencanaan, dan desain masih menggambarkan kondisi sebelum pekerjaan Admin Desa dan migrasi `0013`–`0015`: 8 path admin (sekarang 16 entri `RUTE_ADMIN_TERSEDIA` dan 10 halaman Admin Desa), 13 migrasi (sekarang 16), template 1 modul (sekarang 5), `menu_publik` yang disebut belum dibaca (sekarang dipakai 9 halaman), dan `TTE_SSL` yang masih didokumentasikan (sekarang dihapus, sementara `TTE_ALLOWED_HOSTS` justru tidak didokumentasikan).

Tidak ada klaim yang perlu dihapus dari laporan historis; yang perlu diperbaiki adalah dokumen aktif dan penunjuk statusnya. Rekomendasi §8 disusun agar setiap perbaikan dapat dikerjakan sebagai task terpisah dengan diff kecil dan dapat direview.

## 12. File yang diperiksa

Dokumen:

- `docs/README.md`, `docs/MASTER_ROADMAP.md`, `docs/SID_FEATURE_MAP.md`, `docs/TECHNICAL_AUDIT.md`
- `docs/design/README.md`, `DESIGN-SYSTEM.md`, `ADMIN-PLATFORM-DESIGN.md`, `TENANT-TEMPLATE.md`
- `docs/architecture/MODULE-INVENTORY.md`, `FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md`
- `docs/deployment/README.md`, `ENVIRONMENT.md`, `DATABASE.md`, `STAGING.md`, `BACKUP-RESTORE.md`
- `docs/testing/INTEGRATION-TEST-MAP.md`
- `docs/mockups/README.md`, `docs/reports/README.md`
- `docs/reports/00-baseline/DOKUMEN-KLAIM-AUDIT-2026-11-18.md`, `deployment-documentation-report.md`
- `docs/reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md`, `REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md`, `DOCS-SYNC-MOCKUP-2026-11-19.md`, `CI-FIX-PR-156-2026-11-19.md`
- `docs/reports/03-core-sid/ADMIN-PENDUDUK-2026-11-19.md`, `ADMIN-PENGGUNA-HAK-AKSES-2026-11-19.md`, `ADMIN-SIDEBAR-rbac-menu.md`

Kode dan konfigurasi:

- `src/app/(admin)/**/page.tsx`, `src/app/(admin)/layout.tsx`, `src/app/public-shell.tsx`, `src/app/page.tsx`, `src/app/agenda/page.tsx`, `src/app/berita/page.tsx`, `src/app/profil/page.tsx`
- `src/components/shell/admin-sidebar.tsx`, `src/components/shell/admin-topbar.tsx`, `src/app/globals.css`
- `src/features/navigation/domain/menu-tampil.ts`, `src/features/navigation/application/get-menu.ts`
- `src/features/publik/application/nav-publik.ts`, `src/features/publik/infrastructure/content-repository.ts`
- `src/db/templates/tenant-template.ts`, `src/features/multi-desa/domain/template-tenant.test.ts`, `src/features/multi-desa/provisioning-template.integration.test.ts`
- `src/db/migrations/0014_menu_pengguna_grup_akses.sql`, `0015_menu_penduduk.sql`, `src/db/migrations/meta/_journal.json`
- `src/lib/env.ts`, `.env.example`, `src/features/surat/domain/tte.ts`, `src/features/surat/domain/tte.test.ts`, `src/features/surat/application/tte-use-cases.ts`, `src/features/surat/infrastructure/tte-https.ts`
- `scripts/integration-test-map.mjs`, `scripts/integration-test-map.json`, `vitest.integration.config.mts`, `scripts/generate-module-inventory.mjs`, `package.json`

## 13. File yang diubah

| File | Alasan |
|---|---|
| `docs/reports/00-baseline/DOKUMEN-KONSISTENSI-IMPLEMENTASI-2026-11-19.md` | Laporan audit ini |

Tidak ada source, schema, migration, konfigurasi, atau data yang diubah.

## 14. Security dan tenant

Audit ini tidak mengubah otorisasi, query, atau data. Dua temuan berimplikasi keamanan/operasi:

- **DOK-01:** dokumentasi yang tidak mencantumkan `TTE_ALLOWED_HOSTS` dapat membuat operator mengaktifkan TTE tanpa allowlist; kode akan menolak semua provider, tetapi operator mungkin mencari jalan pintas yang justru melemahkan TLS. Kode saat ini sudah fail-closed dan tidak menyediakan cara mematikan verifikasi; dokumentasi harus mengikutinya.
- **DOK-02:** angka migration yang salah pada checklist staging dapat memicu kebingungan saat verifikasi deployment. Tidak ada data tenant yang terlibat.
- **DOK-05:** dokumen desain masih menyebut sidebar putih sebagai kondisi implementasi. Ini bukan celah keamanan, tetapi dapat membuat review visual menyimpulkan shell belum diselaraskan padahal sudah.

Tidak ada secret, token, NID/NIK, atau data pribadi yang dicetak atau disalin dalam laporan ini.
