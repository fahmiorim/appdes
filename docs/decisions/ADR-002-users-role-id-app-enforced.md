# ADR-002 — `users.role_id` tetap app-enforced

- **Task:** AUD-034 — keputusan relasi `users.role_id` → `roles.id` pada matriks B2.
- **Tanggal:** 16 November 2026
- **Status:** Diterima; dilengkapi ADR-003 (sejak 20 November 2026 kepemilikan tenant juga ditegakkan trigger database).
- **Branch:** `task/AUD-034-users-role-id-app-enforced`
- **Base commit:** `30b81de4be06a39298ec23d2b319cb14740840a8` (`main` setelah PR #80)
- **Commit keputusan:** `200179fc8ea09c37602455b0c232665836236058`
- **PR:** [#82](https://github.com/fahmiorim/appdes/pull/82) — terbuka untuk review.

## Konteks

Kolom `users.role_id` saat ini memiliki FK single-column ke `roles.id`, `ON DELETE SET NULL`. Usulan memperkuatnya dengan composite FK `(users.village_id, users.role_id) → roles(village_id, id)` terlihat konsisten dengan isolasi tenant, tetapi tidak sesuai dengan model otorisasi yang didukung.

`users.village_id` nullable untuk akun platform. `roles.village_id` nullable untuk role global/platform. User desa juga dapat memakai role global tertentu sesuai aturan repository RBAC. Composite FK akan mencocokkan nilai `village_id` secara persis dan akan menolak pasangan user desa + role global (`user.village_id = N`, `role.village_id = NULL`), meskipun relasi ini sengaja diizinkan. Menambah indeks/constraint alternatif atau trigger hanya untuk meniru kondisi `tenant sama ATAU role global` menambah kompleksitas dan mengubah desain relasi tanpa kebutuhan yang cukup.

## Keputusan

Pertahankan FK single-column `users.role_id → roles.id` dengan `ON DELETE SET NULL`. Tidak menambah composite FK, trigger, atau migration untuk relasi ini.

Kepemilikan role ditegakkan oleh validasi aplikasi di use case dan repository, dan setiap pembacaan otorisasi mengikat role terhadap tenant dari identitas/sesi terverifikasi. Role platform hanya diperlakukan sebagai role platform melalui kondisi eksplisit, bukan dengan menyamakan role `administrator` milik desa.

Keputusan ini **tidak** berarti menerima `villageId` dari request sebagai bukti otorisasi. Tenant context tetap berasal dari sesi/DAL dan resolusi server-side.

## Kontrol yang diverifikasi

- `src/features/pengguna/application/pengguna-use-cases.ts`:
  - `ensureRoleExists(roleId, villageId)` mengambil role tenant-scoped dan memastikan `role.villageId === villageId`;
  - menolak role platform/global untuk assignment akun pengguna desa.
- `src/features/pengguna/application/pengguna-use-cases.test.ts`:
  - menolak create dengan role milik desa lain;
  - menolak role platform dan role tanpa tenant;
  - menolak update ke role desa lain;
  - menerima role desa sendiri.
- `src/features/rbac/infrastructure/rbac-repository.ts`:
  - `findRoleById` memfilter role tenant berdasarkan `villageId` dari pemanggil; untuk user desa, hanya role tenant tersebut atau role global yang diizinkan oleh kontrak lookup.
  - pengubahan permission memastikan role dan modul berada pada `villageId` aktif.
- `src/features/rbac/application/authorization.ts`:
  - hak efektif dihitung setelah lookup role tenant-scoped;
  - pengecualian superadmin platform memerlukan kondisi role sistem/global dan konteks sesi platform.
- `src/features/rbac/infrastructure/rbac-tenant-isolation.integration.test.ts`:
  - menguji role Desa A tidak dapat ditemukan dari konteks Desa B;
  - izin efektif kosong ketika role Desa B dipakai dari konteks Desa A;
  - permission modul lintas tenant ditolak;
  - role administrator global hanya menjadi superadmin dalam konteks platform (`villageId === null`).
- Migration `0010_b4c2b_remaining_relations_restrict.sql` sengaja tidak mengubah `users.role_id`; laporan `AUD-034-batch-4c2b-remaining-restrict.md` juga mencatat pengecualian role global.

## File diperiksa

- `AGENTS.md`
- `docs/TECHNICAL_AUDIT.md`
- `docs/reports/01-security/AUD-034-sisa-16-relasi-b2-2026-11-16.md`
- `docs/reports/01-security/AUD-034-batch-4c2b-remaining-restrict.md`
- `src/db/schema/auth.ts`
- `src/features/pengguna/application/pengguna-use-cases.ts`
- `src/features/pengguna/application/pengguna-use-cases.test.ts`
- `src/features/rbac/infrastructure/rbac-repository.ts`
- `src/features/rbac/application/authorization.ts`
- `src/features/rbac/infrastructure/rbac-tenant-isolation.integration.test.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`

## File berubah

- `docs/decisions/ADR-002-users-role-id-app-enforced.md` — keputusan model, alasan teknis, kontrol yang diperiksa, dan risiko tersisa.
- `docs/reports/01-security/AUD-034-users-role-id-app-enforced.md` — rekam jejak task, validasi, dan status PR.

Tidak ada perubahan kode, schema, atau migration.

## Validasi

| Perintah | Hasil |
| --- | --- |
| `npx vitest run --config vitest.config.mts src/features/pengguna/application/pengguna-use-cases.test.ts src/features/rbac/application/authorization.test.ts` | **PASS** 2 berkas / 10 tes |
| `src/features/rbac/infrastructure/rbac-tenant-isolation.integration.test.ts` lokal | **SKIPPED** — memerlukan database MySQL test disposable beserta `TEST_DATABASE_URL` dan `TEST_DATABASE_ACK`; tidak dijalankan di luar konfigurasi yang diverifikasi |
| Integration test RBAC pada CI | **PASS** pada PR #81 (suite integration CI MySQL 8 berhasil). Catatan: integration report RBAC yang eksplisit tetap tidak dijalankan lokal untuk branch dokumentasi ini. |
| Typecheck / lint / build | **SKIPPED** — tidak ada perubahan kode; validasi CI docs-only dapat dilewati oleh `paths-ignore` |

## Risiko tersisa

- Validasi aplikasi tidak sekuat composite constraint apabila ada writer yang melewati use case/repository yang ditinjau. Semua jalur penetapan role yang ditemukan ada di pembuatan akun pengguna, provisioning tenant, dan role yang dibaca dari RBAC; jalur itu mengikat role ke tenant sesuai konteksnya, tetapi tidak ada constraint database untuk mencegah SQL manual/writer baru melanggar invariant.
- FK single-column tetap menjaga keberadaan role dan `ON DELETE SET NULL`; ia tidak menegakkan kesamaan tenant secara universal. Review harus mengulang penelusuran writer bila jalur assign role baru ditambahkan.
- Integrasi eksplisit untuk membuat akun desa dengan role global dan pemeriksaan pembacaan terkait tidak ditambahkan pada task dokumentasi ini; suite existing memverifikasi pembatasan akses dan role platform. Jangan anggap ini sebagai bukti untuk semua kombinasi jalur provisioning.

## Kesimpulan

Composite FK tidak diterapkan karena akan mengubah kontrak role global yang memang digunakan oleh model multi-tenant. Single-column FK dipertahankan, dengan tenant ownership ditegakkan di application layer seperti keputusan pada matriks B2. Keputusan ini dapat ditinjau ulang bila kebijakan role global diubah atau tersedia constraint DB yang merepresentasikan aturan alternatif secara tepat.
