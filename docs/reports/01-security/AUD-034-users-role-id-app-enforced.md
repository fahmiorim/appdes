# AUD-034 — Keputusan `users.role_id` tetap app-enforced

- **Tanggal:** 16 November 2026
- **Branch:** `task/AUD-034-users-role-id-app-enforced`
- **Base commit:** `30b81de4be06a39298ec23d2b319cb14740840a8` (`main` setelah PR #80)
- **Commit dokumentasi keputusan:** `200179fc8ea09c37602455b0c232665836236058`
- **PR:** [#82](https://github.com/fahmiorim/appdes/pull/82) — terbuka untuk review.
- **Tujuan:** menutup item terakhir pada matriks relasi AUD-034 dengan keputusan eksplisit apakah `users.role_id` perlu composite foreign key.

## Kondisi awal dan analisis

Schema `users.role_id` memiliki FK single-column ke `roles.id` dengan `ON DELETE SET NULL`. Kedua tabel memiliki `village_id` nullable karena model mengenal akun platform dan role global. Untuk user desa, lookup RBAC menerima role desa yang sama atau role global sesuai kontrak `findRoleById`; use case akun desa sendiri hanya mengizinkan role desa pada tenant aktif dan menolak role global/platform.

Composite FK `(users.village_id, users.role_id) → roles(village_id, id)` mensyaratkan kecocokan tenant secara persis. Karena itu ia menolak user desa yang memakai role global (`roles.village_id IS NULL`) bila kombinasi tersebut diizinkan oleh jalur lain di model. Constraint tersebut tidak mengekspresikan aturan kondisional “tenant sama atau role global”; menerapkannya berarti perubahan kontrak/model otorisasi, bukan sekadar hardening setara.

## Keputusan

Pertahankan FK single-column `users.role_id → roles.id` (`ON DELETE SET NULL`). Tidak menambah composite FK, trigger, migration, atau perubahan kode produksi. Kepemilikan role tetap ditegakkan oleh use case dan repository server-side berdasarkan tenant yang telah diverifikasi dari sesi/DAL. `villageId` dari input klien bukan bukti otorisasi.

Keputusan ini sejalan dengan `docs/reports/01-security/AUD-034-sisa-16-relasi-b2-2026-11-16.md` §4.3 dan `AUD-034-batch-4c2b-remaining-restrict.md`.

## Kontrol yang diperiksa

- `src/features/pengguna/application/pengguna-use-cases.ts`: `ensureRoleExists` memastikan role ada, dimiliki `villageId` aktif, dan bukan role platform.
- `src/features/pengguna/application/pengguna-use-cases.test.ts`: negative test create untuk role desa lain, role platform dan role tanpa desa; negative test update ke role desa lain; positive test role desa sendiri.
- `src/features/rbac/infrastructure/rbac-repository.ts`: lookup role dan permission mengikat query ke konteks tenant; `setRolePermissions` juga memeriksa kepemilikan role dan modul sebelum menyimpan.
- `src/features/rbac/application/authorization.ts`: role dimuat dengan `villageId` konteks; hak efektif kosong jika role tidak ditemukan pada tenant itu, sementara superadmin platform memiliki kondisi eksplisit.
- `src/features/rbac/infrastructure/rbac-tenant-isolation.integration.test.ts`: negative checks untuk role Desa A dari konteks Desa B, permission modul lintas desa, dan role B yang dipakai pada konteks A; juga memeriksa role platform hanya diakui sebagai superadmin dengan konteks `villageId === null`.
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`: provisioning menyalin data role per slug ke role milik desa tujuan, lalu menetapkan akun administrator baru dengan ID role desa hasil provisioning.
- `src/db/schema/auth.ts`: FK role tetap single-column; tidak diubah.

## File diperiksa

- `AGENTS.md`, `docs/TECHNICAL_AUDIT.md`
- `docs/reports/01-security/AUD-034-sisa-16-relasi-b2-2026-11-16.md`
- `docs/reports/01-security/AUD-034-batch-4c2b-remaining-restrict.md`
- `src/db/schema/auth.ts`
- `src/features/pengguna/application/pengguna-use-cases.ts` dan `pengguna-use-cases.test.ts`
- `src/features/rbac/infrastructure/rbac-repository.ts` dan `rbac-tenant-isolation.integration.test.ts`
- `src/features/rbac/application/authorization.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`

## File berubah

- `docs/decisions/ADR-002-users-role-id-app-enforced.md` — keputusan model, alasan menolak composite FK, kontrol yang diperiksa, risiko, dan kondisi peninjauan ulang.
- `docs/reports/01-security/AUD-034-users-role-id-app-enforced.md` — laporan task ini.

Tidak ada perubahan pada kode, schema, migration, atau data database.

## Validasi

| Pemeriksaan | Hasil |
| --- | --- |
| `npx vitest run --config vitest.config.mts src/features/pengguna/application/pengguna-use-cases.test.ts src/features/rbac/application/authorization.test.ts` | **PASS** — 2 berkas, 10 tes |
| Integration test `src/features/rbac/infrastructure/rbac-tenant-isolation.integration.test.ts` lokal | **SKIPPED** — tidak ada konfigurasi database test disposable `TEST_DATABASE_URL`/`TEST_DATABASE_ACK`; tidak dijalankan ke database dev/production |
| Integration test MySQL 8 pada CI PR #81 | **PASS** — job CI selesai sukses; tidak mengubah kode test pada branch dokumentasi ini |
| Typecheck/lint | **SKIPPED** — dokumentasi saja, tidak ada source berubah |
| Build | **SKIPPED** — dokumentasi saja |
| Migration/database | **SKIPPED** — tidak ada schema/migration/data disentuh |

## Risiko dan batasan

- Application enforcement tidak memberi jaminan database untuk writer SQL baru atau operasi manual yang melewati use case. Jalur assignment yang ditemukan dalam penelusuran adalah pembuatan/perubahan pengguna desa dan provisioning role administrator desa; review harus diulang saat ada jalur baru.
- Tes RBAC integration lokal tidak dijalankan pada branch ini. CI MySQL 8 pada PR #81 berhasil, tetapi keputusan ini sendiri tidak menambahkan assertion integrasi baru.
- Tidak ada migrasi data karena tidak ada perubahan kontrak database.

## Kesimpulan dan rekomendasi

Pertahankan `users.role_id` sebagai single-column FK dengan kepemilikan role dijaga app-enforced. Peninjauan ulang diperlukan jika kebijakan role global berubah atau bila skema tenant-role dirancang ulang sehingga aturan kondisional dapat ditegakkan di database tanpa mematahkan role platform.
