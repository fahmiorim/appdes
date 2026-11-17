-- AUD-034 Batch 4C-2a inverse migration (MySQL 8.0)
--
-- PURPOSE
-- Restore the four original single-column SET NULL foreign keys from
-- 0000_baseline.sql and remove the objects added by
-- 0009_b4c2a_letter_classification_restrict.sql:
--   incoming_letters.classification_id -> letter_classifications.id
--   letter_dinas.classification_id     -> letter_classifications.id
--   letter_types.classification_id     -> letter_classifications.id
--   outgoing_letters.classification_id -> letter_classifications.id
--
-- ORDER
-- Run after AUD-034-b4c1-rollback.sql and AUD-034-b4b-rollback.sql when the
-- database is at 0009. Reverse order matters: 0007/0008 objects may depend on
-- the 0009 unique key.
--
-- IMPORTANT
-- * Operator-run recovery script, NOT a Drizzle migration; it is not tracked in
--   the Drizzle journal.
-- * MySQL DDL auto-commits. The script is NOT atomic and NOT idempotent.
-- * Run on a verified backup/clone first, during a maintenance window, with
--   application writes stopped.
-- * After this script the database no longer enforces tenant ownership for
--   these four relations; only application-layer validation prevents
--   cross-tenant classification references again.
-- * Do not use this script to repair a partially applied 0009. Inspect
--   information_schema and reconcile the live state manually.
--
-- Preconditions to verify manually:
--   1. Schema is at 0009 (no object from 0010 or later is present).
--   2. No statement from this script has already been applied.
--   3. A tested, restorable backup exists.
--   4. `_b4c2a_tenant_preflight_findings` / `_b4c2a_tenant_preflight_abort`
--      are absent. If present, a forward attempt aborted; inspect and drop
--      them manually before continuing.
--
-- Postconditions:
--   * 4 baseline single-column FKs exist again with ON DELETE SET NULL, using
--     the baseline constraint and index names (MySQL reuses the existing
--     `<column>_id_letter_classifications_id_fk` index that 0009 kept).
--   * The 4 *_classification_tenant_fk constraints no longer exist.
--   * letter_classifications_village_id_uq no longer exists. The villages
--     CASCADE FK stays covered by letter_classifications_village_code_unique
--     (village_id, code), so no replacement index is needed.
--   * The 4 *_village_classification_idx indexes no longer exist.
--   * No domain row is modified or deleted.
--
-- Execute statement-by-statement with stop-on-error. Do not continue after any
-- failure; reconcile the exact state first.

-- 1. Drop composite tenant FKs added by 0009.
ALTER TABLE `incoming_letters` DROP FOREIGN KEY `incoming_letters_classification_tenant_fk`;
ALTER TABLE `letter_dinas` DROP FOREIGN KEY `letter_dinas_classification_tenant_fk`;
ALTER TABLE `letter_types` DROP FOREIGN KEY `letter_types_classification_tenant_fk`;
ALTER TABLE `outgoing_letters` DROP FOREIGN KEY `outgoing_letters_classification_tenant_fk`;

-- 2. Drop the composite child indexes introduced by 0009.
DROP INDEX `incoming_letters_village_classification_idx` ON `incoming_letters`;
DROP INDEX `letter_dinas_village_classification_idx` ON `letter_dinas`;
DROP INDEX `letter_types_village_classification_idx` ON `letter_types`;
DROP INDEX `outgoing_letters_village_classification_idx` ON `outgoing_letters`;

-- 3. Drop the parent unique key added by 0009. Its villages CASCADE FK remains
--    covered by letter_classifications_village_code_unique(village_id, code).
ALTER TABLE `letter_classifications` DROP INDEX `letter_classifications_village_id_uq`;

-- 4. Restore the baseline single-column FKs (names and behavior from baseline).
ALTER TABLE `incoming_letters`
  ADD CONSTRAINT `incoming_letters_classification_id_letter_classifications_id_fk`
  FOREIGN KEY (`classification_id`) REFERENCES `letter_classifications` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `letter_dinas`
  ADD CONSTRAINT `letter_dinas_classification_id_letter_classifications_id_fk`
  FOREIGN KEY (`classification_id`) REFERENCES `letter_classifications` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `letter_types`
  ADD CONSTRAINT `letter_types_classification_id_letter_classifications_id_fk`
  FOREIGN KEY (`classification_id`) REFERENCES `letter_classifications` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `outgoing_letters`
  ADD CONSTRAINT `outgoing_letters_classification_id_letter_classifications_id_fk`
  FOREIGN KEY (`classification_id`) REFERENCES `letter_classifications` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- Verification (read-only; expected values in comments).
--   SELECT CONSTRAINT_NAME, DELETE_RULE
--   FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'incoming_letters_classification_id_letter_classifications_id_fk',
--       'letter_dinas_classification_id_letter_classifications_id_fk',
--       'letter_types_classification_id_letter_classifications_id_fk',
--       'outgoing_letters_classification_id_letter_classifications_id_fk');
--   -- expect 4 rows, DELETE_RULE = 'SET NULL'
--
--   SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'incoming_letters_classification_tenant_fk',
--       'letter_dinas_classification_tenant_fk',
--       'letter_types_classification_tenant_fk',
--       'outgoing_letters_classification_tenant_fk');
--   -- expect 0
--
--   SELECT COUNT(*) FROM information_schema.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND INDEX_NAME IN (
--       'letter_classifications_village_id_uq',
--       'incoming_letters_village_classification_idx',
--       'letter_dinas_village_classification_idx',
--       'letter_types_village_classification_idx',
--       'outgoing_letters_village_classification_idx');
--   -- expect 0
