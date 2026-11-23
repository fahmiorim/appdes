# Template Tenant: Modul SID Baru dan Pemeriksaan Klaim Dokumen di CI

- **Tanggal:** 23 November 2026
- **Branch:** `task/template-grants-doc-ci`
- **Base commit:** `05eb8b66` (`task/docs-reconciliation`)
- **Commit pekerjaan:** `1dd466e9`
- **Status:** siap review; belum merge atau deploy

## 1. Tujuan

1. Menambahkan modul dan grant template tenant untuk halaman keuangan, berita,
   galeri, inventaris, absensi, pelayanan, laporan statistik, dan pengaduan.
2. Menambahkan pemeriksaan otomatis di CI agar angka route, template, dan
   migration pada dokumen aktif tidak menyimpang dari source.

## 2. Kondisi awal dan analisis

Template tenant menyemai 23 modul dan 62 grant. Halaman-halaman area tersebut
sudah ada dan beberapa sudah memeriksa permission resource masing-masing, tetapi
tenant baru tidak memperoleh baris modul/grant sehingga halaman tidak muncul di
sidebar dan dapat ditolak 403.

Pemetaan yang dipakai:

| Area | Slug modul | URL | Resource permission |
|---|---|---|---|
| Keuangan | `keuangan` | `/keuangan` | `keuangan` |
| Berita | `berita` | `/konten/berita` | `berita` |
| Galeri | `galeri` | `/konten/galeri` | `galeri` |
| Inventaris | `inventaris` | `/inventaris` | `inventaris` |
| Absensi | `kehadiran` | `/absensi-kepegawaian/absensi` | `kehadiran` |
| Data pegawai | `kepegawaian` | `/absensi-kepegawaian/pegawai` | `kepegawaian` |
| Cuti dan izin | `cuti-izin` | `/absensi-kepegawaian/cuti-izin` | `cuti-izin` |
| Pelayanan publik | `layanan-publik` | `/pelayanan-publik` | `layanan-publik` |
| Laporan statistik | `laporan-statistik` | `/laporan-statistik` | `laporan-statistik` |
| Pengaduan | `pengaduan` | `/pengaduan-admin` | `pengaduan` |

Semua slug anak berada di `RESOURCES`, dan semua URL terdaftar di
`RUTE_ADMIN_TERSEDIA`. `berita` dan `galeri` ditempatkan sebagai anak grup
`website-desa`; modul lainnya menjadi item tingkat atas.

Untuk pencegahan drift, skrip CI menghitung fakta dari source, bukan dari angka
yang ditulis di dokumen:

- jumlah `page.tsx`, halaman `(admin)`, non-super-admin, dan `/super-admin`;
- jumlah `route.ts`/`route.tsx`;
- entri `RUTE_ADMIN_TERSEDIA`;
- jumlah modul, grant, dan menu publik di template tenant;
- jumlah berkas migration SQL dan entri `meta/_journal.json`.

Dokumen aktif dipindai dengan aturan regex eksplisit. `docs/reports/` dikecualikan
karena laporan adalah snapshot historis. Bila sebuah klaim hilang dari dokumen,
skrip juga gagal agar aturan tidak diam-diam berhenti memeriksa.

## 3. File yang diperiksa

- `src/db/templates/tenant-template.ts`
- `src/features/multi-desa/domain/template-tenant.test.ts`
- `src/features/rbac/domain/resources.ts`
- `src/features/navigation/domain/menu-tampil.ts`
- `src/features/navigation/application/build-menu.ts`
- `src/features/rbac/domain/permission.ts`
- `src/app/(admin)/{keuangan,inventaris,absensi-kepegawaian,pelayanan-publik,laporan-statistik,pengaduan-admin,konten}/**`
- `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`, `docs/README.md`
- `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md`
- `docs/architecture/MODULE-INVENTORY.md`
- `docs/deployment/{README,DATABASE}.md`
- `docs/design/{ADMIN-DESA-SCREEN-SPEC,ADMIN-PLATFORM-DESIGN,DESIGN-SYSTEM,TENANT-TEMPLATE}.md`
- `docs/TECHNICAL_AUDIT.md`
- `.github/workflows/ci.yml`, `package.json`, `scripts/integration-test-map.mjs`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/db/templates/tenant-template.ts` | Menambah 10 modul dan 40 grant baru. |
| `src/features/multi-desa/domain/template-tenant.test.ts` | Menguji slug, URL, induk, dan grant keempat role untuk modul baru. |
| `scripts/check-doc-claims.mjs` | Skrip pemeriksa klaim angka dokumen dengan Node built-in. |
| `package.json` | Menambah `npm run docs:check-claims`. |
| `.github/workflows/ci.yml` | Menjalankan pemeriksaan klaim dokumen pada setiap PR, termasuk PR dokumentasi. |
| `docs/README.md` | Mencatat prosedur pemeriksaan angka dokumen. |
| `docs/design/TENANT-TEMPLATE.md` | Memperbarui angka dan status modul/grant. |
| `docs/design/ADMIN-DESA-SCREEN-SPEC.md` | Menutup gap modul/grant yang sudah selesai dan menyisakan gap kedalaman alur tulis. |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | Memperbarui daftar sidebar dan angka modul. |
| `docs/design/DESIGN-SYSTEM.md` | Memperbarui angka template. |
| `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` | Memperbarui angka template. |
| `docs/deployment/{README,DATABASE}.md` | Memperbarui jumlah modul dan grant. |
| `docs/MASTER_ROADMAP.md` | Memperbarui angka template dan checklist review. |
| `docs/SID_FEATURE_MAP.md` | Memperbarui angka template. |

Tidak ada perubahan schema, migration, dependency, atau data database.

## 5. Perubahan

### 5.1 Template tenant

- Modul bertambah dari 23 menjadi 33; grant dari 62 menjadi 102.
- Administrator memegang `manage` untuk 33 modul; `sekretaris`, `operator`, dan
  `kepala-desa` masing-masing memegang 23 grant `read`, termasuk 10 modul baru.
- Semua modul baru aktif, bukan grup, dan URL-nya sudah ada di
  `RUTE_ADMIN_TERSEDIA`.
- Test baru memeriksa setiap modul baru: URL, `parentSlug`, status aktif, bukan
  grup, dan susunan grant `administrator:manage` plus tiga role `read`.

### 5.2 Pemeriksaan klaim dokumen

- `scripts/check-doc-claims.mjs` menghitung fakta dari tree kerja, lalu memeriksa
  64 klaim pada 24 dokumen aktif.
- Aturan mencakup jumlah halaman, pembagian halaman admin, entri menu admin,
  modul/grant/menu publik template, serta migration SQL/journal.
- Klaim yang tidak ditemukan, angka yang berbeda, atau kegagalan membaca source
  menghasilkan exit code 1 dan pesan `file:baris`.
- `docs/reports/` dikecualikan agar laporan historis tidak ditulis ulang.
- CI menjalankan `npm run docs:check-claims` sebelum pemasangan dependency,
  sehingga PR dokumentasi tetap memvalidasi angka tanpa `npm ci`.

## 6. Security dan tenant

- Tidak ada jalur otorisasi baru. Modul/grant hanya mengisi data RBAC tenant baru;
  pemeriksaan permission server-side yang sudah ada tetap berlaku.
- `manage` tetap hanya untuk `administrator`. Role lain mendapat `read`.
- Semua URL modul diverifikasi test terhadap `RUTE_ADMIN_TERSEDIA`, sehingga tidak
  ada tautan mati atau label "Segera" baru.
- Tidak ada data tenant, NIK, atau secret yang ditambahkan ke template, test,
  laporan, atau output.
- Tidak ada operasi lintas tenant, query baru, atau perubahan data tenant lama.
- Template hanya dipakai saat provisioning tenant baru. Tenant yang sudah ada
  tidak berubah dan tidak ada backfill.

## 7. Validasi

Perintah dijalankan dari root repository pada branch ini.

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Unit test template | `npx vitest run src/features/multi-desa/domain/template-tenant.test.ts` | **PASS** — 21 test |
| Typecheck | `npm run typecheck` | **PASS** — `next typegen` dan `tsc --noEmit` |
| Lint file berubah | `npx eslint src/db/templates/tenant-template.ts src/features/multi-desa/domain/template-tenant.test.ts scripts/check-doc-claims.mjs` | **PASS** — tanpa error |
| Format | `npx prettier --check <file berubah>` | **PASS** |
| Klaim dokumen | `npm run docs:check-claims` | **PASS** — 64 klaim, 24 dokumen; 149 halaman, 102 admin, 115 route handler, 33 modul/102 grant, 52 migration/52 journal |
| Uji negatif skrip | Ubah sementara `33 modul` menjadi `34 modul`, jalankan skrip, lalu pulihkan | **PASS** — exit 1 dan dua pesan `MASTER_ROADMAP.md:50/137` |
| Integration test | — | **SKIPPED** — tidak ada perubahan schema/migration; butuh database MySQL test disposable |
| Build | — | **SKIPPED** — tidak diperlukan untuk perubahan data template, dokumen, dan skrip Node; CI tetap menjalankan build pada PR kode |

## 8. Diff

`git show --stat 1dd466e9`: 15 file, +512/−26, termasuk satu file baru
`scripts/check-doc-claims.mjs`.

## 9. Risiko dan keterbatasan

- Provisioning tenant baru belum dijalankan terhadap MySQL pada task ini. Test
  unit memvalidasi isi template dan ketersediaan rute, tetapi integration test
  provisioning tetap perlu dijalankan pada database test disposable sebelum
  staging.
- Tenant lama tidak otomatis mendapat modul/grant baru. Bila diperlukan, ini harus
  menjadi task terpisah dengan prosedur apply/backfill yang disengaja.
- Skrip memeriksa klaim yang polanya terdaftar. Kalimat baru dengan angka berbeda
  tetapi tanpa pola yang dikenal tidak akan terdeteksi; menambah pola baru adalah
  bagian dari perubahan dokumen.
- CI workflow belum dijalankan di GitHub pada task ini. Validasi lokal membuktikan
  skrip dan langkah CI dapat dijalankan, bukan hasil run GitHub Actions.
- Kedalaman CRUD per halaman tetap berbeda dan tidak berubah oleh task ini.

## 10. Kesimpulan dan langkah berikutnya

Template tenant kini membuka area keuangan, konten, inventaris, kepegawaian,
pelayanan, statistik, dan pengaduan untuk tenant baru, dan angka inventaris pada
dokumen aktif dijaga oleh pemeriksaan CI. Langkah berikutnya adalah menjalankan
provisioning test pada database test disposable, lalu review diff dan laporan ini
sebelum merge.
