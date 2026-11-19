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

Gunakan laporan sesuai cakupannya; tidak ada satu laporan yang mewakili seluruh 89 aset.

| Acuan | Cakupan | Cara memakai |
|---|---|---|
| [Audit mockup Super Admin](./05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md) | 38 layar Super Admin, 9 area baru, status route/model data | Acuan terkini untuk konsol platform |
| [Review mockup Admin Desa](./05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md) | 10 layar Admin Desa | Acuan terkini untuk area desa |
| [Audit final 42 mockup](./05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md) | 21 publik, 11 akun, 7 pendukung, landing/login, dashboard Super Admin lama | Snapshot historis 18 November; jangan dipakai sebagai katalog lengkap |
| [Katalog mockup](../mockups/README.md) | 89 path dan pengelompokan aset | Sumber inventaris file |

Dokumen di `archive/` dipertahankan untuk jejak audit. Jangan mengutipnya sebagai status terbaru tanpa memeriksa laporan penggantinya.

## Aturan

1. Beri nama deskriptif dan sertakan tanggal, misalnya `AUD-019-tte-security-2026-11-16.md`.
2. Cantumkan branch, commit, file yang diperiksa, validasi PASS/FAIL/SKIPPED, serta risiko tersisa.
3. Jangan menyalin secret, kredensial, NIK, atau data pribadi ke laporan.
4. Bila laporan digantikan, tambahkan rujukan ke penggantinya lalu pindahkan laporan lama ke `archive/`.
5. Jangan menghapus laporan historis hanya karena sudah tua; lihat [kebijakan dokumentasi](../README.md).
