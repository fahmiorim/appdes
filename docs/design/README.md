# Desain

Folder ini hanya memuat spesifikasi desain yang masih menjadi acuan implementasi.

| Dokumen | Isi |
|---|---|
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | Token, komponen, pola halaman, dan aturan aksesibilitas |
| [ADMIN-PLATFORM-DESIGN.md](./ADMIN-PLATFORM-DESIGN.md) | Spesifikasi visual Admin Desa dan Super Admin |
| [ADMIN-DESA-SCREEN-SPEC.md](./ADMIN-DESA-SCREEN-SPEC.md) | Spesifikasi per layar untuk 12 halaman Admin Desa: mockup acuan, layout, data, permission, backend, gap, dan test |
| [TENANT-TEMPLATE.md](./TENANT-TEMPLATE.md) | Desain isi template tenant bawaan |

Referensi gambar ada di [mockups/](../mockups/README.md). Audit visual historis dan draft yang sudah digantikan berada di [reports/05-ui-audit/archive/](../reports/05-ui-audit/archive/); jangan memakai dokumen arsip sebagai status desain terbaru.

Status per 19 November 2026 di bawah adalah snapshot audit; inventaris route aktif per 23 November 2026 ada di [laporan rekonsiliasi](../reports/00-baseline/DOCS-RECONCILIATION-2026-11-23.md). Acuan berikut dipakai sesuai cakupannya, bukan sebagai satu laporan tunggal:

- [Audit mockup dan dokumen](../reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md) — status per 19 November 2026 untuk 39 layar Super Admin dan 46 layar Admin Desa terhadap 12 halaman Admin Desa saat itu, menu, grant, dan backend.
- [Audit kesiapan backend](../reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md) — snapshot backend pada base `0ffeda6`; saat itu 11 halaman Admin Desa. Gunakan untuk schema/use case, bukan jumlah halaman terbaru.
- [Audit mockup Super Admin](../reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md) — 38 layar pada snapshot 19 November pagi dan kesenjangan model data; layar ke-39 ada di audit terbaru.
- [Review mockup Admin Desa](../reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md) — 10 layar Admin Desa lama; path asetnya sudah tidak aktif dan digantikan 46 layar di katalog.
- [Audit final 42 mockup](../reports/05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md) — snapshot publik, akun, dan pendukung per 18 November 2026; tetap historis dan tidak mencakup layar Super Admin yang ditambahkan kemudian.
