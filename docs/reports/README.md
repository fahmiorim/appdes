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

- [Audit final mockup ↔ UI ↔ backend](./05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md) — acuan status 42 mockup.
- [Katalog mockup](../mockups/README.md) — path dan pengelompokan aset.

Dokumen di `archive/` dipertahankan untuk jejak audit. Jangan mengutipnya sebagai status terbaru tanpa memeriksa laporan penggantinya.

## Aturan

1. Beri nama deskriptif dan sertakan tanggal, misalnya `AUD-019-tte-security-2026-11-16.md`.
2. Cantumkan branch, commit, file yang diperiksa, validasi PASS/FAIL/SKIPPED, serta risiko tersisa.
3. Jangan menyalin secret, kredensial, NIK, atau data pribadi ke laporan.
4. Bila laporan digantikan, tambahkan rujukan ke penggantinya lalu pindahkan laporan lama ke `archive/`.
5. Jangan menghapus laporan historis hanya karena sudah tua; lihat [kebijakan dokumentasi](../README.md).
