# Perbaikan Konsistensi Dokumentasi — 19 November 2026

- **Task:** memperbaiki 10 temuan audit dokumentasi (`DOK-01`–`DOK-10`) agar dokumen aktif sesuai dengan implementasi `origin/main`.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/docs-consistency-fixes`, dibuat dari `origin/main`.
- **Base commit:** `58347a6d3a2b89070b2483aed343e441842447de`.
- **Jenis task:** perbaikan dokumentasi dan satu pesan generator inventaris. Tidak ada perubahan schema, migration, data, otorisasi, atau perilaku aplikasi.
- **Status:** selesai — siap review.

## 1. Dasar pekerjaan

Perbaikan mengikuti temuan pada laporan
[`DOKUMEN-KONSISTENSI-IMPLEMENTASI-2026-11-19.md`](https://github.com/fahmiorim/appdes/blob/3873399/docs/reports/00-baseline/DOKUMEN-KONSISTENSI-IMPLEMENTASI-2026-11-19.md)
(branch `task/docs-consistency-implementation-audit`, commit `3873399`).
Tidak ada temuan baru yang diperluas di luar `DOK-01`–`DOK-10`.

Dokumen historis dan laporan snapshot **tidak** diubah. Angka bertanggal di
`docs/TECHNICAL_AUDIT.md` dan laporan `docs/reports/` tetap dipertahankan
sebagai rekaman kondisi saat ditulis.

## 2. Ringkasan perubahan per temuan

| ID | File | Perubahan | Status |
|---|---|---|---|
| DOK-01 | `docs/deployment/ENVIRONMENT.md` | Menghapus baris `TTE_SSL`; menambahkan `TTE_ALLOWED_HOSTS` (format host/port, exact match, fail-closed, wajib untuk `bsre`); mengganti peringatan agar menyatakan TLS selalu aktif dan `TTE_SSL` diabaikan; mengganti contoh `.env` | Selesai |
| DOK-02 | `docs/deployment/README.md`, `docs/deployment/DATABASE.md`, `docs/deployment/STAGING.md` | Jumlah migrasi 13 → 16 (`0000`–`0015`); deskripsi template 4 role/5 modul/11 grant | Selesai |
| DOK-03 | `docs/SID_FEATURE_MAP.md` | Mengganti klaim "UI belum tersedia/8 path" dengan 17 halaman admin, 16 entri `RUTE_ADMIN_TERSEDIA`, 10 halaman Admin Desa, dan batas baca-saja; memperbarui catatan template dan §3 | Selesai |
| DOK-04 | `docs/design/TENANT-TEMPLATE.md` | Payload template diselaraskan dengan sumber (5 modul, 11 grant); fakta halaman dan `menu_publik` diperbarui; klaim cakupan integration test dikoreksi; status menu publik dan versi template diperbaiki | Selesai |
| DOK-05 | `docs/design/ADMIN-PLATFORM-DESIGN.md` | Klaim kondisi implementasi diperbaiki: sidebar desa navy/ungu, menu Beranda + Penduduk + grup Pengaturan; target §1 tetap dibiarkan sebagai keputusan produk | Selesai (keputusan desain masih terbuka) |
| DOK-06 | `docs/architecture/MODULE-INVENTORY.md`, `scripts/generate-module-inventory.mjs` | Inventaris diregenerasi dari `origin/main` `58347a6`: 46 halaman, 82 route handler, 17 halaman admin, 6 Server Action; ringkasan generator memakai kata "termasuk" agar tidak terbaca sebagai daftar lengkap | Selesai |
| DOK-07 | `docs/testing/INTEGRATION-TEST-MAP.md` | Fail-safe "Seluruh 47 test" → "Seluruh 53 test" | Selesai |
| DOK-08 | `docs/mockups/README.md` | Aturan penggunaan tidak lagi menunjuk audit final sebagai status implementasi tunggal; mengarah ke laporan sesuai cakupan | Selesai |
| DOK-09 | `docs/reports/README.md`, `docs/design/README.md` | Review mockup Admin Desa disebut sebagai acuan visual; status implementasi diarahkan ke laporan `03-core-sid` | Selesai |
| DOK-10 | `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` | Menghapus klaim rute `/admin`; menyebut path Admin Desa yang benar dan `RUTE_ADMIN_TERSEDIA` | Selesai |

## 3. Detail keputusan

### 3.1 TTE

`TTE_SSL` tidak ada di skema `src/lib/env.ts` dan tidak dibaca
`parseKonfigTte`; verifikasi TLS tidak dapat dimatikan. Dokumentasi sekarang
mencantumkan `TTE_ALLOWED_HOSTS`, yang sudah ada di `.env.example` dan
ditegakkan saat menyimpan konfigurasi (`tte-use-cases.ts`) serta saat
memvalidasi provider (`tte.ts`, `tte-jaringan.ts`).

### 3.2 Template tenant

Payload contoh di `TENANT-TEMPLATE.md` disamakan dengan
`src/db/templates/tenant-template.ts`: 5 modul (`beranda`, `penduduk`, grup
`pengaturan`, `pengguna`, `grup-akses`) dan 11 grant. Integration test
provisioning memang membandingkan seluruh modul dengan `TENANT_TEMPLATE`, tetapi
hanya mengassert matriks grant `beranda`; klaim lama "matriks grant yang
diharapkan" terlalu luas dan sudah dikoreksi.

### 3.3 Menu publik

Sembilan halaman yang memanggil `getNavPublik` adalah `/dokumen`, `/kontak`,
`/layanan`, `/layanan/surat`, `/pengaduan`, `/potensi`, `/sejarah`,
`/transparansi/apbdes`, dan `/visi-misi`. Halaman publik lain, termasuk beranda,
berita, profil, dan agenda, masih menulis daftar tautannya sendiri.

### 3.4 Peta integration test

Peta tidak diregenerasi penuh karena format `--markdown` dari generator berbeda:
output generator hanya ringkasan dan tabel, sedangkan dokumen menyimpan
kebijakan seleksi test yang tidak dihasilkan skrip. Perbaikan dibatasi pada
angka fail-safe yang salah; angka ringkasan 53/20/21 sudah benar dan tetap
divalidasi dengan `--check`.

### 3.5 Inventaris modul

`npm run docs:inventory` menulis ulang dokumen dari `origin/main` `58347a6`.
Selain menambahkan 9 route Admin Desa, hasilnya menunjukkan **46** halaman,
bukan 45 seperti pada laporan audit. Selisih itu berasal dari glob audit
`src/app/**/page.tsx` yang tidak menangkap `src/app/page.tsx`; angka 46 adalah
hitungan lengkap dan dipakai di inventaris. Laporan audit tidak diubah karena
berstatus snapshot; koreksi dicatat di sini.

## 4. File yang diperiksa

- `docs/deployment/ENVIRONMENT.md`, `README.md`, `DATABASE.md`, `STAGING.md`
- `docs/SID_FEATURE_MAP.md`
- `docs/design/TENANT-TEMPLATE.md`, `ADMIN-PLATFORM-DESIGN.md`, `README.md`
- `docs/architecture/MODULE-INVENTORY.md`, `FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md`
- `docs/testing/INTEGRATION-TEST-MAP.md`
- `docs/mockups/README.md`, `docs/reports/README.md`
- `src/lib/env.ts`, `src/features/surat/domain/tte.ts`, `tte-jaringan.ts`, `tte-use-cases.ts`, `src/features/surat/infrastructure/tte-https.ts`
- `src/db/templates/tenant-template.ts`, `src/features/multi-desa/domain/template-tenant.test.ts`, `src/features/multi-desa/provisioning-template.integration.test.ts`
- `src/db/migrations/meta/_journal.json`, `src/features/navigation/domain/menu-tampil.ts`, `src/features/publik/application/nav-publik.ts`
- `src/app/globals.css`, `src/components/shell/admin-sidebar.tsx`
- `scripts/generate-module-inventory.mjs`, `scripts/integration-test-map.mjs`, `package.json`

## 5. File yang diubah

| File | Alasan |
|---|---|
| `docs/deployment/ENVIRONMENT.md` | DOK-01 |
| `docs/deployment/README.md` | DOK-02 |
| `docs/deployment/DATABASE.md` | DOK-02 |
| `docs/deployment/STAGING.md` | DOK-02 |
| `docs/SID_FEATURE_MAP.md` | DOK-03 |
| `docs/design/TENANT-TEMPLATE.md` | DOK-04 |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | DOK-05 |
| `docs/architecture/MODULE-INVENTORY.md` | DOK-06 (hasil generator) |
| `scripts/generate-module-inventory.mjs` | DOK-06 (wording ringkasan agar tidak menyesatkan) |
| `docs/testing/INTEGRATION-TEST-MAP.md` | DOK-07 |
| `docs/mockups/README.md` | DOK-08 |
| `docs/reports/README.md`, `docs/design/README.md` | DOK-09 |
| `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` | DOK-10 |
| `docs/reports/00-baseline/DOKUMEN-KONSISTENSI-PERBAIKAN-2026-11-19.md` | Laporan ini |

## 6. Security dan tenant

Tidak ada perubahan kode aplikasi, query, permission, schema, atau data.
Perubahan environment hanya dokumentasi; nilai contoh tetap placeholder dan
tidak memuat secret nyata. `TTE_ALLOWED_HOSTS` didokumentasikan sebagai kontrol
fail-closed, dan dokumentasi menegaskan verifikasi TLS tidak dapat dimatikan.
Tidak ada NIK asli, token, atau data pribadi yang ditambahkan.

## 7. Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format seluruh file berubah | `npx prettier --check <file berubah>` | **PASS** — semua sesuai Prettier |
| Peta integration test | `node scripts/integration-test-map.mjs --check` | **PASS** — 53 test, 20 modul, 21 lintas modul |
| Generator inventaris | `npm run docs:inventory` | **PASS** — `pages=46 routes=82 actions=6`, dokumen ditulis ulang |
| Tautan relatif dokumentasi | skrip Node atas seluruh `docs/**/*.md` | **PASS** — 164 berkas, 148 tautan relatif, 0 hilang |
| Sisa klaim usang | `grep` untuk 13 migrasi, 1 modul/4 grant, 47 test, 36 halaman, 81 route handler, 8 halaman admin | **PASS** — hanya tersisa di `TECHNICAL_AUDIT.md` yang bertanggal "per 18 November 2026" (snapshot yang disengaja) |
| `TTE_SSL` | `grep` di `docs/` | **PASS** — hanya tersisa pada peringatan "sudah dihapus" dan catatan historis AUD-020 |
| Rute `/admin` | `grep` di `docs/architecture`, `docs/design`, `docs/deployment` | **PASS** — tidak ada klaim area Admin Desa memakai `/admin` |
| `git diff --check` | `git diff --check` | **PASS** — tidak ada whitespace error |
| Typecheck/lint/unit/integration/build | Tidak dijalankan | **SKIPPED** — tidak ada perubahan kode aplikasi; skrip generator dieksekusi langsung dan berhasil |

## 8. Risiko dan keterbatasan

- Semua angka diambil dari `origin/main` `58347a6`; PR lain setelah commit ini
  dapat mengubah jumlah halaman, route, atau test.
- Perilaku runtime halaman Admin Desa tidak diuji dalam task dokumentasi ini.
- Keputusan produk untuk warna sidebar/aksi (§1 vs mockup) masih terbuka;
  yang diperbaiki hanya klaim kondisi implementasi.
- Peta integration test belum diregenerasi penuh agar kebijakan seleksi test
  tidak hilang; angka fail-safe sudah diperbaiki.
- Dokumen historis sengaja tidak diubah, sehingga angka bertanggal di
  `TECHNICAL_AUDIT.md` tetap berbeda dari kondisi sekarang.

## 9. Kesimpulan

Sepuluh temuan audit sudah diperbaiki pada dokumen aktif. Tidak ada perubahan
kode aplikasi atau data. Validasi format, tautan, generator inventaris, dan peta
integration test lulus. Branch siap review; merge menunggu maintainer.
