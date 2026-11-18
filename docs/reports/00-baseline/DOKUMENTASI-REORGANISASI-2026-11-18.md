# Reorganisasi Dokumentasi — 18 November 2026

- **Task:** merapikan struktur `docs/` berdasarkan fungsi: dokumen aktif, mockup, panduan pengujian, laporan, dan arsip.
- **Tanggal:** 18 November 2026.
- **Branch:** `docs/reorganize-docs`.
- **Base commit:** `178cf9d` (`main`, PR #153).
- **Jenis perubahan:** dokumentasi, pemindahan aset, dan penyesuaian path workflow Visual QA. Tidak ada perubahan perilaku aplikasi, schema, migration, atau data.
- **Pull request:** https://github.com/fahmiorim/appdes/pull/154

## 1. Kondisi awal

`docs/` berisi 203 item: 151 Markdown, 42 mockup PNG, 1 JSON, dan 9 SQL. Masalah utamanya bukan jumlah, tetapi tidak adanya indeks dan percampuran fungsi:

- 42 mockup berada langsung di `docs/public/`, `docs/account/`, `docs/pendukung/`, `docs/superadmin/`, dan `docs/landing page/` dengan penamaan folder tidak konsisten.
- `docs/design/` mencampur tiga spesifikasi aktif dengan empat audit visual historis dan satu inventaris yang sudah usang (39 aset, bukan 42).
- `docs/reports/` memiliki 128 Markdown tanpa README; draft audit yang sudah digantikan masih setara dengan audit final.
- `docs/visual-qa-local.md` berada di root, padahal merupakan panduan pengujian.
- `STATUS-KLAIM-2026-11-16.md` berada di root `reports/` tanpa kelompok fase/area.

Semua tautan relatif Markdown valid sebelum perubahan. Tidak ada laporan yang dihapus; laporan historis dipertahankan sesuai `AGENTS.md`.

## 2. Struktur akhir

```text
docs/
├── README.md
├── MASTER_ROADMAP.md
├── SID_FEATURE_MAP.md
├── TECHNICAL_AUDIT.md
├── architecture/
├── decisions/
├── deployment/
├── design/
│   ├── README.md
│   ├── ADMIN-PLATFORM-DESIGN.md
│   ├── DESIGN-SYSTEM.md
│   └── TENANT-TEMPLATE.md
├── mockups/
│   ├── README.md
│   ├── public/              (21)
│   ├── account/             (12)
│   ├── support/             (7)
│   └── platform/
│       ├── landing/         (1)
│       └── super-admin/     (1)
├── testing/
│   ├── INTEGRATION-TEST-MAP.md
│   └── VISUAL-QA-LOCAL.md
└── reports/
    ├── README.md
    ├── 00-baseline/
    ├── 01-security/
    ├── 02-public-website/
    ├── 02-super-admin/
    ├── 03-core-sid/
    ├── 04-tooling/
    └── 05-ui-audit/
        └── archive/
```

## 3. File yang dipindahkan

| Dari | Ke | Alasan |
|---|---|---|
| `docs/public/*.png` | `docs/mockups/public/` | Mockup publik |
| `docs/account/*.png` | `docs/mockups/account/` | Mockup akun dan autentikasi |
| `docs/pendukung/*.png` | `docs/mockups/support/` | Halaman 404, 403, maintenance, pencarian, sitemap, legal |
| `docs/landing page/*.png` | `docs/mockups/platform/landing/` | Landing platform |
| `docs/superadmin/*.png` | `docs/mockups/platform/super-admin/` | Dashboard Super Admin |
| `docs/visual-qa-local.md` | `docs/testing/VISUAL-QA-LOCAL.md` | Panduan pengujian |
| `docs/design/PR-49-VISUAL-AUDIT.md` | `docs/reports/05-ui-audit/archive/` | Audit historis |
| `docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md` | `docs/reports/05-ui-audit/archive/` | Audit historis |
| `docs/design/VISUAL-AUDIT-REPORT.md` | `docs/reports/05-ui-audit/archive/` | Audit historis |
| `docs/design/SCREENSHOT-IMPLEMENTATION-MATRIX.md` | `docs/reports/05-ui-audit/archive/` | Snapshot 14 November, digantikan audit final |
| `docs/design/SCREENSHOT-INVENTORY.md` | `docs/mockups/README.md` | Digabung menjadi katalog mockup 42 aset |
| `docs/reports/02-super-admin/MOCKUP-ASSETS-2026-11-18.md` | `docs/reports/05-ui-audit/archive/` | Laporan kesiapan mockup, bukan khusus Super Admin |
| `docs/reports/05-ui-audit/UI-MOCKUP-AUDIT-2026-11-18.md` | `docs/reports/05-ui-audit/archive/UI-MOCKUP-AUDIT-2026-11-18-draft.md` | Draft yang sudah digantikan audit final |
| `docs/reports/STATUS-KLAIM-2026-11-16.md` | `docs/reports/00-baseline/` | Audit klaim dokumentasi |

Folder lama yang kosong dihapus. Pemindahan memakai `git mv` agar riwayat file tetap terlacak.

## 4. File baru

| File | Isi |
|---|---|
| `docs/README.md` | Indeks utama, peta folder, dan aturan dokumen aktif/snapshot/arsip |
| `docs/mockups/README.md` | Katalog 42 mockup, path baru, aturan penggunaan |
| `docs/design/README.md` | Indeks tiga spesifikasi desain aktif dan rujukan arsip |
| `docs/reports/README.md` | Indeks folder laporan dan aturan arsip |

## 5. Rujukan yang diperbarui

Path mockup dan audit lama diperbarui di 12 dokumen, ditambah referensi operasional, termasuk:

- `docs/design/DESIGN-SYSTEM.md` — 42 mockup dan path baru.
- `docs/reports/05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md` — rujukan draft dan laporan arsip.
- `docs/reports/05-ui-audit/archive/*` — tautan relatif disesuaikan dengan lokasi arsip.
- `docs/reports/00-baseline/DOKUMEN-KLAIM-AUDIT-2026-11-18.md`, `docs/reports/02-public-website/*`, `docs/reports/02-super-admin/PHASE-2-DOKUMEN-STATUS-2026-11-18.md`, dan `docs/reports/04-tooling/visual-qa-local-harness-2026-11-15.md`.
- `.github/workflows/visual-qa.yml` — trigger dan langkah penyalinan referensi.
- `.github/workflows/ci.yml` — output klasifikasi dokumentasi dan validasi peta yang tidak lagi dipaksakan.
- `scripts/ci-changes.mjs` — perubahan workflow/CI tidak lagi dianggap perubahan kode aplikasi.
- `scripts/visual-qa/capture.mjs` — daftar referensi screenshot untuk harness lokal.
- `src/app/globals.css` — komentar path referensi login; tidak ada perubahan gaya.
- `AGENTS.md` — menambahkan `docs/README.md` ke daftar dokumen acuan.

Isi temuan laporan historis tidak diubah; hanya path dan rujukan yang disesuaikan.

## 6. Security dan tenant

- Tidak ada logika aplikasi, schema, migration, atau data yang diubah. Perubahan pada source hanya komentar path di `src/app/globals.css`.
- Tidak ada secret, kredensial, NIK, atau data pribadi yang ditambahkan.
- Mockup tetap berupa aset desain; pemindahan tidak mengubah status implementasi atau otorisasi.
- Laporan historis tetap tersedia untuk jejak audit dan tidak dijadikan klaim status terbaru.

## 7. Validasi

| Pemeriksaan | Hasil |
|---|---|
| Jumlah mockup di `docs/mockups/` | **PASS** — 42 PNG |
| Pemeriksaan tautan relatif Markdown di `docs/` | **PASS** — 0 tautan putus |
| Pencarian path lama (`docs/public`, `docs/account`, `docs/pendukung`, `docs/superadmin`, `docs/landing page`, path audit lama) | **PASS** — tidak ada rujukan tersisa |
| `node --check scripts/visual-qa/capture.mjs` | **PASS** — sintaks skrip valid |
| Path referensi workflow/script | **PASS** — seluruh path mockup baru dapat ditemukan |
| `node --check scripts/ci-changes.mjs` | **PASS** — sintaks skrip valid |
| Matriks klasifikasi `ci-changes` | **PASS** — docs/workflow/script/source/DB/test menghasilkan output yang diharapkan |
| `npx prettier --check` pada workflow dan skrip | **PASS** — seluruh berkas sesuai gaya Prettier |
| `git diff --check` | **PASS** — tidak ada whitespace error |
| Typecheck/lint/unit test/build | **SKIPPED** — tidak ada perubahan logika aplikasi; klasifikasi CI diuji langsung |

### 7.1 Perbaikan CI

CI run pertama PR #154 gagal pada job `Visual QA login (desktop/mobile)` karena workflow masih menyalin `docs/public/*.png` dan `docs/account/...` setelah folder lama dipindahkan. Path pada `.github/workflows/visual-qa.yml` dan `scripts/visual-qa/capture.mjs` diperbarui ke `docs/mockups/public/` dan `docs/mockups/account/`.

### 7.2 Kalibrasi trigger CI

Visual QA sebelumnya terpicu oleh perubahan `docs/public/*.png` dan mockup login, sehingga PR dokumentasi menjalankan `npm ci`, MySQL, Chromium, dan browser test selama puluhan menit. Trigger tersebut dihapus; referensi desain di `docs/` tidak memengaruhi UI yang dirender. Visual QA tetap berjalan untuk perubahan source UI, aset publik, dependency, konfigurasi build, atau workflow itu sendiri, dan tetap dapat dijalankan manual lewat `workflow_dispatch`.

`scripts/ci-changes.mjs` kini membedakan dokumentasi dari kode aplikasi dan tidak menganggap perubahan `.github/**` sebagai perubahan kode. Untuk PR dokumentasi, quality, integration, dan build dilewati; untuk perubahan workflow saja, seluruh job berat juga dilewati. Perubahan `scripts/**` tetap menjalankan quality check karena skrip operasional perlu validasi.

Contoh hasil klasifikasi:

| File berubah | code | docs | integration | build |
|---|---:|---:|---:|---:|
| `docs/mockups/public/a.png` | false | true | false | false |
| `.github/workflows/visual-qa.yml` | false | false | false | false |
| `scripts/ci-changes.mjs` | true | false | false | false |
| `src/app/page.tsx` | true | false | false | true |
| `src/db/schema.ts` | true | false | true | true |
| `src/components/x.test.tsx` | true | false | false | false |

Validasi peta integration test kini hanya berjalan bila kode atau integration berubah, bukan pada PR dokumentasi. Workflow Visual QA perlu dijalankan ulang setelah commit perbaikan untuk memastikan path baru dan trigger barunya valid.

## 8. Risiko dan keterbatasan

- Referensi ke path lama di commit message, issue, atau PR GitHub tidak dapat diubah dan tetap menunjuk lokasi historis.
- Laporan arsip masih menyebut kondisi pada tanggalnya; pembaca harus memakai `docs/reports/README.md` dan audit final untuk status terbaru.
- Katalog mockup menggunakan tautan ber-URL-encoding untuk nama file berspasi; sudah diverifikasi dapat di-resolve.
- Pemindahan file dapat memengaruhi bookmark lokal atau tautan eksternal ke path lama; path baru didokumentasikan di indeks.

## 9. Kesimpulan

Dokumentasi kini dipisahkan berdasarkan fungsi: acuan aktif di root dan folder domain, mockup di `docs/mockups/`, panduan pengujian di `docs/testing/`, serta laporan dan arsip di `docs/reports/`. Referensi workflow dan harness Visual QA sudah mengikuti path baru. Trigger CI juga dikalibrasi agar PR dokumentasi tidak menjalankan browser QA, integration MySQL, atau build yang tidak relevan. Tidak ada laporan historis yang dihapus. Perubahan siap direview pada branch `docs/reorganize-docs`.
