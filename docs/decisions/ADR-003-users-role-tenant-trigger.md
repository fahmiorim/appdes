# ADR-003 — Kepemilikan tenant `users.role_id` ditegakkan trigger database

- **Task:** AUD-035 — menutup celah `users.role_id` dari Matriks B2.
- **Tanggal:** 20 November 2026
- **Status:** Diterima; melengkapi ADR-002.
- **Branch:** `task/AUD-035-role-tenant-constraint`
- **Base commit:** `304d5b9` (`main` setelah PR #169)

## Konteks

ADR-002 mempertahankan FK single-column `users.role_id → roles.id` (`ON DELETE SET NULL`) dan menegakkan kepemilikan role di application layer. Konsekuensinya, SQL manual atau writer baru yang melewati use case/repository dapat menetapkan role milik desa lain, atau role platform pada akun desa.

Constraint yang dicoba lebih dulu:

1. **Composite FK `(users.village_id, users.role_id) → roles(village_id, id)`.** Ditolak: MySQL melewati pemeriksaan FK bila salah satu kolom NULL, sehingga akun platform (`village_id IS NULL`) dapat memakai role desa mana pun.
2. **FK pada kunci tenant generated `IFNULL(village_id, 0)`.** Kunci ini menutup dua arah, tetapi `ALTER TABLE ... ADD <kolom> GENERATED ... STORED` gagal `ER_CANT_CREATE_TABLE`/1215 pada MySQL 8.0.30 ketika ekspresi memakai kolom yang sudah menjadi bagian FK (`village_id`). FK pada generated column juga tidak mendukung `ON DELETE SET NULL`, sehingga perilaku hapus role harus diubah.
3. **Trigger `BEFORE INSERT/UPDATE`.** Dipilih. Tidak mengubah schema, mempertahankan `ON DELETE SET NULL`, dan berlaku untuk semua writer termasuk Better Auth.

## Keputusan

Migration `0017_role_tenant_trigger.sql` memasang tiga trigger:

| Trigger | Aturan |
| --- | --- |
| `users_role_tenant_bi` | Akun desa hanya boleh memakai role `roles.village_id` yang sama; akun platform (`village_id IS NULL`) hanya boleh memakai role platform (`roles.village_id IS NULL`). |
| `users_role_tenant_bu` | Aturan yang sama untuk `UPDATE`, termasuk memindahkan `village_id` akun tanpa mengganti role. |
| `roles_tenant_village_bu` | `roles.village_id` tidak boleh diubah selama role masih dipakai `users`. |

Pelanggaran menghasilkan `SIGNAL SQLSTATE '45000'` dengan pesan generik tanpa data tenant. Migration menjalankan preflight fail-closed lebih dulu: bila database sudah memuat akun desa dengan role platform atau akun platform dengan role desa, migration berhenti sebelum trigger dipasang dan mencatat temuannya di `_rct_tenant_preflight_findings`.

## Konsekuensi

- `users.role_id` tetap `ON DELETE SET NULL`; menghapus role tidak berubah perilakunya.
- Validasi application layer di `pengguna-use-cases.ts` dan `rbac-repository.ts` tetap dipertahankan sebagai lapisan pertama dan untuk pesan yang ramah pengguna.
- Trigger tidak terlihat di schema Drizzle; `db:generate` tetap "No schema changes". Perubahan trigger hanya lewat migration baru.
- Database yang sudah berisi pelanggaran harus dibersihkan manual sebelum `0017` dapat diterapkan; migration tidak memperbaiki data secara diam-diam.

## Validasi

- `src/db/m0017-role-tenant-constraint.integration.test.ts` — 9 test: role sewilayah dan role platform diterima; role desa lain, role platform pada akun desa, role desa pada akun platform, update role lintas tenant, update `village_id` akun, dan pemindahan role yang dipakai ditolak; role tanpa anggota boleh dipindah; `deleteRole` tetap melepas `role_id` anggota.
- Migration dijalankan pada database uji baru `desa_test_rct` (18 migration, 3 trigger terpasang).
- `db:generate` → "No schema changes, nothing to migrate".
