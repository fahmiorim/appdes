# Laporan

Laporan task, audit, dan snapshot pemeriksaan. Setiap laporan merekam kondisi saat dikerjakan; laporan lama tidak diperbarui seolah kondisi sekarang, kecuali koreksi path atau tautan.

## Struktur

| Folder | Cakupan |
|---|---|
| [`00-baseline/`](./00-baseline/) | Baseline, CI, deployment documentation, dan audit klaim dokumen |
| [`01-security/`](./01-security/) | Temuan AUD, hardening multi-tenant, migration, dan rollback |
| [`02-public-website/`](./02-public-website/) | Pekerjaan dan audit website publik |
| [`02-super-admin/`](./02-super-admin/) | Fase 2, lifecycle tenant, dan konsol Super Admin |
| [`03-core-sid/`](./03-core-sid/) | Modul inti SID, admin shell, agenda, dan perbaikan terkait |
| [`04-tooling/`](./04-tooling/) | Harness dan kebijakan tooling |
| [`05-ui-audit/`](./05-ui-audit/) | Audit mockup, UI, dan backend |
| [`05-ui-audit/archive/`](./05-ui-audit/archive/) | Audit visual lama, draft yang digantikan, dan inventaris awal |

## Acuan audit UI

Gunakan laporan sesuai cakupannya; tidak ada satu laporan yang mewakili seluruh 126 aset.

| Acuan | Cakupan | Cara memakai |
|---|---|---|
| [Audit mockup dan dokumen](./05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md) | Status terkini 39 layar Super Admin dan 46 layar Admin Desa terhadap 12 halaman Admin Desa, menu, grant, route, dan backend | **Acuan terkini** untuk "layar ini sudah bisa dipakai atau belum" dan koreksi klaim dokumen |
| [Kesiapan backend mockup baru](./05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md) | Snapshot 39 layar Super Admin dan 46 layar Admin Desa pada base `0ffeda6`; saat itu 11 halaman Admin Desa | Acuan schema/use case per area; jumlah halaman dan status route di dalamnya sudah historis |
| [Delta schema dari mockup](./05-ui-audit/MOCKUP-SCHEMA-DELTA-2026-11-20.md) | Pemetaan 46 layar Admin Desa dan 39 layar Super Admin terhadap schema `0017`: tabel baru, penyesuaian kolom, dan area tanpa perubahan | **Acuan terkini** untuk kebutuhan schema per area mockup; bukan rencana migration final |
| [Audit UI Admin Desa vs dokumen](./05-ui-audit/ADMIN-DESA-UI-VS-DOKUMEN-2026-11-19.md) | Implementasi `origin/main` terhadap Design System, spesifikasi Admin, peta fitur, dan 10 mockup lama | Snapshot sebelum PR #159; jumlah halaman dan status route terbaru ada di audit mockup dan dokumen |
| [Audit mockup Super Admin](./05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md) | 38 layar Super Admin per 19 November pagi; 9 area baru, status route/model data | Pemetaan rinci per layar; layar Laporan & Analitik ke-39 dan status terbaru ada di audit mockup dan dokumen |
| [Review mockup Admin Desa](./05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md) | 10 layar Admin Desa lama | Snapshot sebelum ekspansi 46 layar; path lama tidak lagi aktif |
| [Audit final 42 mockup](./05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md) | 21 publik, 11 akun, 7 pendukung, landing/login, dashboard Super Admin lama | Snapshot historis 18 November; jangan dipakai sebagai katalog lengkap |
| [Katalog mockup](../mockups/README.md) | 126 path dan pengelompokan aset | Sumber inventaris file |
| [Sinkronisasi dokumen mockup](./05-ui-audit/DOCS-SYNC-MOCKUP-2026-11-19.md) | Penyelarasan Design System, peta fitur, dan roadmap | Catatan keputusan relevansi fase dan backlog platform |
| [Perbaikan check CI PR #156](./05-ui-audit/CI-FIX-PR-156-2026-11-19.md) | Perbaikan format dan integration test template tenant | Bukti akar masalah dan validasi 1.979 unit + 290 integration test |
| [Rebuild website publik dari mockup](./02-public-website/PUBLIC-MOCKUP-REBUILD-2026-11-20.md) | Rangkaian 21 halaman publik, perbaikan format/type/lint, dan renumber migration komentar | Catatan pekerjaan stack PR publik dan risiko merge berurutan |
| [Perbaikan migration Galeri dan Potensi](./02-public-website/MIGRASI-GALERI-POTENSI-2026-11-20.md) | Migration `0022` idempotent untuk kolom/tabel yang dilewati akibat urutan timestamp journal | Bukti analisis dan batas validasi database |
| [Merge rangkaian website publik](./02-public-website/PUBLIC-MOCKUP-MERGE-2026-11-20.md) | Penyelesaian #189–#194, penutupan PR duplikat, dan verifikasi Galeri pada database lokal | Bukti check CI per PR dan status merge |
| [Sinkronisasi `main` PR #209](./03-core-sid/ADMIN-SURAT-PR-209-2026-11-21.md) | Dashboard surat/pelayanan: renumber migrasi 0027–0031, paritas skema, dan pemindahan akses data keluar dari route/application layer | Bukti check lokal (typecheck, lint, format, 2.078 unit test, build) dan risiko yang tersisa |

Dokumen di `archive/` dipertahankan untuk jejak audit. Jangan mengutipnya sebagai status terbaru tanpa memeriksa laporan penggantinya.

## Aturan

1. Beri nama deskriptif dan sertakan tanggal, misalnya `AUD-019-tte-security-2026-11-16.md`.
2. Cantumkan branch, commit, file yang diperiksa, validasi PASS/FAIL/SKIPPED, serta risiko tersisa.
3. Jangan menyalin secret, kredensial, NIK, atau data pribadi ke laporan.
4. Bila laporan digantikan, tambahkan rujukan ke penggantinya lalu pindahkan laporan lama ke `archive/`.
5. Jangan menghapus laporan historis hanya karena sudah tua; lihat [kebijakan dokumentasi](../README.md).
