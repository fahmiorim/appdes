-- AUD-034 Batch 4C-2b inverse migration (MySQL 8.0)
--
-- PURPOSE
-- Restore the four original single-column SET NULL foreign keys from
-- 0000_baseline.sql and remove the objects added by
-- 0010_b4c2b_remaining_relations_restrict.sql:
--   analisis_indikator.kategori_id  -> analisis_kategori.id
--   area.ref_polygon                -> polygon.id
--   inventaris.kategori_id          -> inventaris_kategori.id
--   kelompok.category_id            -> kelompok_master.id
--
-- IMPORTANT
-- * This is an operator-run recovery script, NOT a Drizzle migration, and it is
--   not tracked in the Drizzle journal.
-- * MySQL DDL auto-commits. The script is NOT atomic and is NOT idempotent.
-- * Run only against a verified backup/clone first, during a maintenance window.
-- * Stop application writes before running it. Application code from Batch
--   4C-2b is compatible with both schemas: the repositories set the column to
--   NULL explicitly before deleting the parent, which is also valid when the
--   database FK is SET NULL again.
-- * After this script, the database no longer enforces tenant ownership for
--   these four relations. Cross-tenant references become possible again; only
--   application-layer validation prevents them (as before Batch 4C-2b).
-- * Do not run this script to recover a partially applied 0010 migration.
--   Inspect information_schema first and reconcile the live state manually.
--
-- Preconditions to verify manually:
--   1. Schema is fully at 0010_b4c2b_remaining_relations_restrict.sql.
--   2. No statement from this script has already been applied.
--   3. A tested, restorable backup exists.
--   4. `_b4c2b_tenant_preflight_findings` / `_b4c2b_tenant_preflight_abort`
--      are absent. If present, a forward attempt aborted; inspect before
--      continuing and drop them manually.
--
-- Postconditions:
--   * 4 baseline single-column FKs exist again with ON DELETE SET NULL.
--   * 4 *_tenant_fk constraints no longer exist.
--   * 4 *_village_id_uq unique keys no longer exist.
--   * analisis_indikator_village_kategori_idx and kelompok_village_category_idx
--     no longer exist. Pre-existing indexes (area_village_polygon_idx,
--     inv_village_kategori, kelompok_category_idx) are preserved.
--   * analisis_indikator, kelompok and analisis_kategori regain the
--     single-column village_id index that the baseline MySQL auto-created for
--     their villages CASCADE FK.
--     Those indexes were absorbed by the composite 0010 index, so dropping the
--     composite index without recreating them fails with errno 1553.
--   * No domain row is modified or deleted.
--
-- Execute statement-by-statement with stop-on-error. Do not continue after any
-- failure; reconcile the exact state first.

-- 1. Drop composite tenant FKs added by 0010.
ALTER TABLE `analisis_indikator` DROP FOREIGN KEY `analisis_indikator_kategori_tenant_fk`;
ALTER TABLE `area` DROP FOREIGN KEY `area_polygon_tenant_fk`;
ALTER TABLE `inventaris` DROP FOREIGN KEY `inventaris_kategori_tenant_fk`;
ALTER TABLE `kelompok` DROP FOREIGN KEY `kelompok_category_tenant_fk`;

-- 2. Drop the four parent unique keys (no composite FK depends on them any
--    more). `analisis_kategori` has no other village_id index, so its villages
--    CASCADE FK first needs a replacement index; without it the DROP INDEX
--    fails with errno 1553. The other three parents keep their pre-existing
--    village_id indexes and need no replacement.
CREATE INDEX `analisis_kategori_village_id_villages_id_fk`
  ON `analisis_kategori` (`village_id`);
ALTER TABLE `analisis_kategori` DROP INDEX `analisis_kategori_village_id_uq`;
ALTER TABLE `polygon` DROP INDEX `polygon_village_id_uq`;
ALTER TABLE `inventaris_kategori` DROP INDEX `inventaris_kategori_village_id_uq`;
ALTER TABLE `kelompok_master` DROP INDEX `kelompok_master_village_id_uq`;

-- 3. Restore the baseline single-column FKs (names and behavior from baseline).
ALTER TABLE `analisis_indikator`
  ADD CONSTRAINT `analisis_indikator_kategori_id_analisis_kategori_id_fk`
  FOREIGN KEY (`kategori_id`) REFERENCES `analisis_kategori` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `area`
  ADD CONSTRAINT `area_ref_polygon_polygon_id_fk`
  FOREIGN KEY (`ref_polygon`) REFERENCES `polygon` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `inventaris`
  ADD CONSTRAINT `inventaris_kategori_id_inventaris_kategori_id_fk`
  FOREIGN KEY (`kategori_id`) REFERENCES `inventaris_kategori` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `kelompok`
  ADD CONSTRAINT `kelompok_category_id_kelompok_master_id_fk`
  FOREIGN KEY (`category_id`) REFERENCES `kelompok_master` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- 4. Recreate the village_id indexes the composite 0010 indexes absorbed. The
--    villages CASCADE FKs need a leftmost village_id index; without these,
--    step 5 fails with "Cannot drop index ...: needed in a foreign key
--    constraint" (errno 1553). Names follow the baseline auto-created
--    convention.
CREATE INDEX `analisis_indikator_village_id_villages_id_fk`
  ON `analisis_indikator` (`village_id`);
CREATE INDEX `kelompok_village_id_villages_id_fk` ON `kelompok` (`village_id`);

-- 5. Drop the two child indexes that 0010 introduced.
DROP INDEX `analisis_indikator_village_kategori_idx` ON `analisis_indikator`;
DROP INDEX `kelompok_village_category_idx` ON `kelompok`;

-- Verification (read-only; expected values in comments).
--   SELECT CONSTRAINT_NAME, DELETE_RULE
--   FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'analisis_indikator_kategori_id_analisis_kategori_id_fk',
--       'area_ref_polygon_polygon_id_fk',
--       'inventaris_kategori_id_inventaris_kategori_id_fk',
--       'kelompok_category_id_kelompok_master_id_fk');
--   -- expect 4 rows, DELETE_RULE = 'SET NULL'
--
--   SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME LIKE '%_tenant_fk'
--     AND CONSTRAINT_NAME IN (
--       'analisis_indikator_kategori_tenant_fk','area_polygon_tenant_fk',
--       'inventaris_kategori_tenant_fk','kelompok_category_tenant_fk');
--   -- expect 0
--
--   SELECT COUNT(*) FROM information_schema.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND INDEX_NAME IN ('analisis_kategori_village_id_uq','polygon_village_id_uq',
--                        'inventaris_kategori_village_id_uq',
--                        'kelompok_master_village_id_uq',
--                        'analisis_indikator_village_kategori_idx',
--                        'kelompok_village_category_idx');
--   -- expect 0
