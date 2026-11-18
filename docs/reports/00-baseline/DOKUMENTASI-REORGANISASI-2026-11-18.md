# Reorganisasi Dokumentasi — 18 November 2026

- **Task:** merapikan struktur `docs/` berdasarkan fungsi: dokumen aktif, mockup, panduan pengujian, laporan, dan arsip.
- **Tanggal:** 18 November 2026.
- **Branch:** `docs/reorganize-docs`.
- **Base commit:** `178cf9d` (`main`, PR #153).
- **Jenis perubahan:** dokumentasi dan pemindahan aset. Tidak ada perubahan source, schema, migration, atau data.

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

Path mockup dan audit lama diperbarui di 12 dokumen, termasuk:

- `docs/design/DESIGN-SYSTEM.md` — 42 mockup dan path baru.
- `docs/reports/05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md` — rujukan draft dan laporan arsip.
- `docs/reports/05-ui-audit/archive/*` — tautan relatif disesuaikan dengan lokasi arsip.
- `docs/reports/00-baseline/DOKUMEN-KLAIM-AUDIT-2026-11-18.md`, `docs/reports/02-public-website/*`, `docs/reports/02-super-admin/PHASE-2-DOKUMEN-STATUS-2026-11-18.md`, dan `docs/reports/04-tooling/visual-qa-local-harness-2026-11-15.md`.
- `AGENTS.md` — menambahkan `docs/README.md` ke daftar dokumen acuan.

Isi temuan laporan historis tidak diubah; hanya path dan rujukan yang disesuaikan.

## 6. Security dan tenant

- Tidak ada source aplikasi, schema, migration, konfigurasi, atau data yang diubah.
- Tidak ada secret, kredensial, NIK, atau data pribadi yang ditambahkan.
- Mockup tetap berupa aset desain; pemindahan tidak mengubah status implementasi atau otorisasi.
- Laporan historis tetap tersedia untuk jejak audit dan tidak dijadikan klaim status terbaru.

## 7. Validasi

| Pemeriksaan | Hasil |
|---|---|
| Jumlah mockup di `docs/mockups/` | **PASS** — 42 PNG |
| Pemeriksaan tautan relatif Markdown di `docs/` | **PASS** — 0 tautan putus |
| Pencarian path lama (`docs/public`, `docs/account`, `docs/pendukung`, `docs/superadmin`, `docs/landing page`, path audit lama) | **PASS** — tidak ada rujukan tersisa |
| `npx prettier --check "docs/**/*.md" AGENTS.md` | **PASS** — seluruh berkas sesuai gaya Prettier |
| `git diff --check` | **PASS** — tidak ada whitespace error |
| Typecheck/test/build | **SKIPPED** — tidak ada perubahan kode |

## 8. Risiko dan keterbatasan

- Referensi ke path lama di commit message, issue, atau PR GitHub tidak dapat diubah dan tetap menunjuk lokasi historis.
- Laporan arsip masih menyebut kondisi pada tanggalnya; pembaca harus memakai `docs/reports/README.md` dan audit final untuk status terbaru.
- Katalog mockup menggunakan tautan ber-URL-encoding untuk nama file berspasi; sudah diverifikasi dapat di-resolve.
- Pemindahan file dapat memengaruhi bookmark lokal atau tautan eksternal ke path lama; path baru didokumentasikan di indeks.

## 9. Kesimpulan

Dokumentasi kini dipisahkan berdasarkan fungsi: acuan aktif di root dan folder domain, mockup di `docs/mockups/`, panduan pengujian di `docs/testing/`, serta laporan dan arsip di `docs/reports/`. Tidak ada laporan historis yang dihapus. Perubahan siap direview pada branch `docs/reorganize-docs`.
