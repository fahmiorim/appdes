# AUD-001 — Test Kepemilikan Role Lintas Tenant

- **Tanggal:** 14 November 2026
- **Branch:** `task/AUD-001-role-tenant-ownership-v2`
- **Base:** `main` — `1624f0675049722f08dc8aedb6d68986a1561afa`
- **Tujuan:** Mengunci perilaku kepemilikan role pada perhitungan izin dengan
  test regresi, tanpa perubahan kode produksi.

## Kondisi awal

`main` sudah menerapkan isolasi tenant pada RBAC:

- `findRoleById(roleId, villageId)` memfilter role berdasarkan desa;
- `listModules(villageId)` dan `listLevelsByRole(roleId, villageId)` dibatasi
  desa;
- `computeEffectivePermissions` mengembalikan izin kosong bila role tidak
  ditemukan, dan hanya mengakui superadmin platform bila slug `administrator`,
  `isSystem`, `role.villageId === null`, dan `villageId === null`.

Yang belum ada adalah test di layer aplikasi. Branch lama
`task/AUD-001-role-tenant-ownership` memuat test, tetapi kontraknya mengikuti
kode lama (`listLevelsByRole(roleId)` tanpa `villageId`), sehingga tidak dapat
dipakai langsung pada `main`. Test ditulis ulang agar sesuai kontrak saat ini.

## Perubahan

- `src/features/rbac/application/authorization.test.ts` (baru) — 4 test:
  1. Role desa dimuat dengan `villageId` sesi; `findRoleById`,
     `listModules`, dan `listLevelsByRole` menerima desa yang benar.
  2. Role yang tidak ditemukan pada desa sesi menghasilkan izin kosong tanpa
     memuat modul atau level.
  3. Role `administrator` milik desa tidak dianggap superadmin.
  4. Superadmin platform hanya diakui saat role `villageId === null` dan sesi
     `villageId === null`, tanpa query modul.

Tidak ada perubahan pada kode produksi.

## Security/tenant

- Test menegaskan role tenant tidak dapat menjadi superadmin platform.
- Test menegaskan kegagalan pencarian role tenant-scoped berujung pada penolakan
  (izin kosong), bukan fallback ke izin desa lain.
- Tidak ada data tenant nyata; fixture hanya ID dan slug.

## Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run src/features/rbac/application/authorization.test.ts` | PASS — 4 test |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx prettier --check src/features/rbac` | PASS |

## Risiko tersisa

- Test memakai repository tiruan; jaminan bahwa query repository benar-benar
  memfilter `village_id` tetap dipegang integration test RBAC yang sudah ada di
  `main` (`src/features/rbac/infrastructure/rbac-tenant-isolation.integration.test.ts`),
  yang tidak dijalankan pada branch ini.

## Status

Siap review. Belum di-merge dan belum di-deploy.
