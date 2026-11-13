# Arsip Dokumen Audit dari Branch yang Tidak Di-merge

- **Tanggal:** 14 November 2026
- **Branch:** `task/arsip-audit-dokumen`
- **Base:** `main` — `1624f0675049722f08dc8aedb6d68986a1561afa`
- **Tujuan:** Menyelamatkan dokumen audit dan keputusan yang hanya ada pada
  branch kerja lama, sebelum branch tersebut dihapus.

## Latar belakang

Beberapa branch kerja berisi laporan audit, ADR, dan dokumentasi operasi yang
tidak pernah masuk `main` karena branch-nya tidak di-merge. Sebagian perubahan
kode pada branch tersebut sudah tercakup di `main`, sehingga yang tersisa hanya
dokumen. Dokumen-dokumen itu disalin apa adanya ke branch ini, tanpa mengubah
isinya, agar jejak audit tetap dapat dibaca reviewer.

## Sumber dokumen

| Dokumen | Branch asal | Commit asal |
|---|---|---|
| `docs/decisions/ADR-001-mock-bsre-provider.md` | `docs/adr-mock-bsre-provider` | `621eccc` |
| `docs/reports/01-security/ADR-001-mock-bsre-provider.md` | `docs/adr-mock-bsre-provider` | `621eccc` |
| `docs/reports/01-security/AUD-002-composite-tenant-foreign-keys.md` | `task/AUD-002-composite-tenant-fk` | `f00cc9b` |
| `docs/reports/01-security/AUD-011-family-join-tenant-scope.md` | `task/AUD-011-family-join-tenant-scope` | `99418b5` |
| `docs/reports/01-security/AUD-012-resident-list-join-tenant-scope.md` | `task/AUD-012-resident-list-join-tenant-scope` | `35e78ac` |
| `docs/reports/00-baseline/baseline-report.md` | `task/phase-0-baseline` | `f53387a` |
| `docs/reports/00-baseline/deployment-documentation-report.md` | `task/phase-0-deployment-documentation` | `cad9e06` |
| `docs/deployment/*.md` (5 berkas) | `task/phase-0-deployment-documentation` | `cad9e06` |

Perubahan pada `docs/MASTER_ROADMAP.md` dan `docs/SID_FEATURE_MAP.md` dari
branch `docs/adr-mock-bsre-provider` **tidak** disalin karena isinya sudah
tergantikan versi `main` yang lebih baru (bagian arsitektur FlexiDesa dan status
TTE). Menyalinnya akan mengembalikan informasi yang sudah usang.

## File yang ditambahkan

- `docs/decisions/ADR-001-mock-bsre-provider.md`
- `docs/reports/01-security/ADR-001-mock-bsre-provider.md`
- `docs/reports/01-security/AUD-002-composite-tenant-foreign-keys.md`
- `docs/reports/01-security/AUD-011-family-join-tenant-scope.md`
- `docs/reports/01-security/AUD-012-resident-list-join-tenant-scope.md`
- `docs/reports/00-baseline/baseline-report.md`
- `docs/reports/00-baseline/deployment-documentation-report.md`
- `docs/deployment/README.md`, `ENVIRONMENT.md`, `DATABASE.md`,
  `BACKUP-RESTORE.md`, `OPERATIONS.md`

## Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --check docs` | PASS — `All matched files use Prettier code style!` |
| `npm run typecheck` | tidak relevan (hanya dokumentasi) |
| Unit/integration test | tidak dijalankan (tidak ada perubahan kode) |

## Risiko dan batasan

- Dokumen disalin apa adanya; bila ada tautan internal ke branch yang sudah
  dihapus, tautan itu tetap berupa nama branch dan tidak lagi dapat di-resolve.
- Laporan lama dapat memuat commit SHA yang tidak lagi ada di branch remote,
  tetapi objek commit tersebut tetap ada selama masih dijangkau `main` atau
  reflog; isi laporan tidak diubah agar tidak mengaburkan jejak audit.
- Tidak ada perubahan kode pada PR ini, sehingga tidak ada risiko runtime.

## Kesimpulan

Dokumen audit yang sebelumnya hanya tersedia di branch kerja lama kini tersedia
di `main` melalui satu PR arsip. Setelah PR ini di-merge, branch sumbernya dapat
dihapus tanpa kehilangan laporan.
