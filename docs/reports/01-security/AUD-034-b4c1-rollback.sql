-- AUD-034 Batch 4C-1 inverse migration (MySQL 8.0)
--
-- PURPOSE
-- Restore the two original single-column SET NULL foreign keys from
-- 0000_baseline.sql and remove the objects added by
-- 0008_b4c1_restrict_relations_composite_fk.sql:
--   berita.kategori_id          -> berita_kategori.id
--   perangkat_desa.jabatan_id   -> jabatan_perangkat.id
--
-- ORDER
-- Run after AUD-034-b4c2a-rollback.sql (0009) and before
-- AUD-034-b4b-rollback.sql (0007). Reverse order of the forward migrations.
--
-- IMPORTANT
-- * Operator-run recovery script, NOT a Drizzle migration; it is not tracked in
--   the Drizzle journal.
-- * MySQL DDL auto-commits. The script is NOT atomic and NOT idempotent.
-- * Run on a verified backup/clone first, during a maintenance window, with
--   application writes stopped.
-- * After this script the database no longer enforces tenant ownership for
--   these two relations, and deleting a referenced parent silently sets the
--   child column to NULL again instead of failing.
-- * Do not use this script to repair a partially applied 0008. Inspect
--   information_schema and reconcile the live state manually.
--
-- Preconditions to verify manually:
--   1. Schema is at 0009 or later but no object from 0010/0011 is present.
--   2. No statement from this script has already been applied.
--   3. A tested, restorable backup exists.
--   4. `_b4c1_tenant_preflight_findings` / `_b4c1_tenant_preflight_abort`
--      are absent. If present, a forward attempt aborted; inspect and drop
--      them manually before continuing.
--
-- Postconditions:
--   * 2 baseline single-column FKs exist again with ON DELETE SET NULL.
--   * berita_kategori_tenant_fk and perangkat_desa_jabatan_tenant_fk no longer
--     exist.
--   * berita_kategori_village_id_uq and jabatan_perangkat_village_id_uq no
--     longer exist. Their villages CASCADE FKs stay covered by the pre-existing
--     berita_kategori_village_slug_unique and
--     jabatan_perangkat_village_slug_unique (village_id leftmost), so no
--     replacement index is needed.
--   * berita_village_kategori_idx and perangkat_desa_village_jabatan_idx no
--     longer exist. The baseline berita_kategori_idx and
--     perangkat_desa_jabatan_idx indexes are preserved and reused by the
--     restored FKs.
--   * No domain row is modified or deleted.
--
-- Execute statement-by-statement with stop-on-error. Do not continue after any
-- failure; reconcile the exact state first.

-- 1. Drop composite tenant FKs added by 0008.
ALTER TABLE `berita` DROP FOREIGN KEY `berita_kategori_tenant_fk`;
ALTER TABLE `perangkat_desa` DROP FOREIGN KEY `perangkat_desa_jabatan_tenant_fk`;

-- 2. Drop the composite child indexes introduced by 0008.
DROP INDEX `berita_village_kategori_idx` ON `berita`;
DROP INDEX `perangkat_desa_village_jabatan_idx` ON `perangkat_desa`;

-- 3. Drop the parent unique keys added by 0008.
ALTER TABLE `berita_kategori` DROP INDEX `berita_kategori_village_id_uq`;
ALTER TABLE `jabatan_perangkat` DROP INDEX `jabatan_perangkat_village_id_uq`;

-- 4. Restore the baseline single-column FKs (names and behavior from baseline).
ALTER TABLE `berita`
  ADD CONSTRAINT `berita_kategori_id_berita_kategori_id_fk`
  FOREIGN KEY (`kategori_id`) REFERENCES `berita_kategori` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `perangkat_desa`
  ADD CONSTRAINT `perangkat_desa_jabatan_id_jabatan_perangkat_id_fk`
  FOREIGN KEY (`jabatan_id`) REFERENCES `jabatan_perangkat` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- Verification (read-only; expected values in comments).
--   SELECT CONSTRAINT_NAME, DELETE_RULE
--   FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'berita_kategori_id_berita_kategori_id_fk',
--       'perangkat_desa_jabatan_id_jabatan_perangkat_id_fk');
--   -- expect 2 rows, DELETE_RULE = 'SET NULL'
--
--   SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'berita_kategori_tenant_fk', 'perangkat_desa_jabatan_tenant_fk');
--   -- expect 0
--
--   SELECT COUNT(*) FROM information_schema.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND INDEX_NAME IN (
--       'berita_kategori_village_id_uq', 'jabatan_perangkat_village_id_uq',
--       'berita_village_kategori_idx', 'perangkat_desa_village_jabatan_idx');
--   -- expect 0
