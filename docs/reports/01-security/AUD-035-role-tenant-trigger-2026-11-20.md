# AUD-035 — Trigger kepemilikan tenant `users.role_id`

- **Task:** AUD-035 — menegakkan kepemilikan tenant role di database, menutup sisa Matriks B2.
- **Tanggal:** 20 November 2026.
- **Branch:** `task/AUD-035-role-tenant-constraint`.
- **Base commit:** `304d5b9` (`main` setelah PR #169 merged).
- **Status:** siap review.

## 1. Kondisi awal

ADR-002 mempertahankan FK single-column `users.role_id → roles.id` dengan `ON DELETE SET NULL`, dan kepemilikan role hanya divalidasi di application layer (`ensureRoleExists`, `getScopedRole`). Writer yang melewati use case — SQL manual, job baru, atau perubahan Better Auth — dapat menetapkan role desa lain atau role platform ke akun desa.

Dua pendekatan constraint dicoba dan gagal pada MySQL 8.0.30:

1. Composite FK `(village_id, role_id)` — MySQL melewati pemeriksaan bila salah satu kolom NULL, sehingga akun platform bisa memakai role desa.
2. FK pada generated column `IFNULL(village_id, 0)` — `ADD COLUMN ... GENERATED ALWAYS AS (...) STORED` ditolak `ERROR 1215` karena ekspresi memakai kolom yang sudah menjadi bagian FK; FK pada generated column juga tidak mendukung `ON DELETE SET NULL`.

## 2. Perubahan

| File | Perubahan |
| --- | --- |
| `src/db/migrations/0017_role_tenant_trigger.sql` | Preflight fail-closed + tiga trigger: insert/update `users` dan update `roles.village_id`. |
| `src/db/migrations/meta/_journal.json` | Entri `0017_role_tenant_trigger` (`when` 1795365363264, setelah `0016`). |
| `src/db/migrations/meta/0017_snapshot.json` | Salinan snapshot `0016`; trigger tidak memengaruhi schema Drizzle. |
| `src/db/m0017-role-tenant-constraint.integration.test.ts` | 9 test integrasi. |
| `vitest.integration.config.mts`, `scripts/integration-test-map.json` | Registrasi test. |
| `docs/decisions/ADR-003-users-role-tenant-trigger.md` | Keputusan dan alasan trigger. |
| `docs/decisions/ADR-002-users-role-id-app-enforced.md` | Ditandai dilengkapi ADR-003. |
| `docs/MASTER_ROADMAP.md` | Status `users.role_id` diperbarui. |

Tidak ada perubahan schema Drizzle, kode aplikasi, atau data domain.

## 3. Perilaku yang ditegakkan

- Akun desa hanya boleh memakai role dengan `village_id` sama.
- Akun platform (`village_id IS NULL`) hanya boleh memakai role platform (`village_id IS NULL`).
- `UPDATE users` yang memindahkan `village_id` tanpa mengganti role ditolak.
- `roles.village_id` tidak boleh diubah selama role masih dipakai `users`.
- Pelanggaran menghasilkan `SIGNAL SQLSTATE '45000'` dengan pesan generik.
- `ON DELETE SET NULL` pada `users.role_id` tidak berubah; `deleteRole` tetap melepas role anggota.

## 4. Validasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | **PASS** |
| ESLint | `npx eslint src/db/m0017-role-tenant-constraint.integration.test.ts` | **PASS** |
| Prettier | `npx prettier --check <6 berkas berubah>` | **PASS** |
| Peta integration test | `node scripts/integration-test-map.mjs --check` | **PASS** — 56 test, 20 modul |
| Schema drift | `npx drizzle-kit generate` | **PASS** — "No schema changes" |
| Migration pada DB uji baru | `DATABASE_URL=…/desa_test_rct npx drizzle-kit migrate` | **PASS** — 18 migration, 3 trigger |
| Integration test baru | `TEST_DATABASE_URL=…/desa_test_rct … vitest run --config vitest.integration.config.mts src/db/m0017-role-tenant-constraint.integration.test.ts` | **PASS** — 9 test |
| Suite integration penuh | — | **SKIPPED** — dijalankan CI |

## 5. Risiko dan keterbatasan

- Trigger tidak terlihat di schema Drizzle; perubahan aturan hanya lewat migration baru dan tidak akan terdeteksi `db:generate`.
- Database yang sudah memuat pelanggaran akan menghentikan `0017` (preflight fail-closed) dan harus dibersihkan manual. Database lokal `desa_dev` dan `sid_staging_local` diperiksa: 0 pelanggaran.
- Trigger `BEFORE UPDATE` pada `users` berjalan untuk setiap update akun; biayanya satu lookup primary key `roles`.
- Migration belum dijalankan pada staging/production, sesuai keputusan saat ini.

## 6. Rekomendasi

1. Review migration dan test, lalu jalankan `0017` pada salinan database sebelum staging.
2. Setelah merged, catat trigger pada dokumentasi operasi database agar tidak dihapus tanpa mengganti aturannya.
