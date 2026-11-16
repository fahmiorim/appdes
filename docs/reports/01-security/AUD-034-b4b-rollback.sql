-- AUD-034 Batch 4B inverse migration (MySQL 8.0)
--
-- PURPOSE
-- Restore the five original single-column CASCADE foreign keys from
-- 0000_baseline.sql and remove the objects added by
-- 0007_b4b_cascade_relations_composite_fk.sql:
--   anggota_grup_kontak.kontak_id                     -> kontak.id
--   anggota_grup_kontak.grup_id                       -> kontak_grup.id
--   incoming_letter_dispositions.incoming_letter_id   -> incoming_letters.id
--   outgoing_letter_shipments.outgoing_letter_id      -> outgoing_letters.id
--   kelompok_anggota.kelompok_id                      -> kelompok.id
--
-- ORDER
-- Run last: after AUD-034-b4c2a-rollback.sql (0009) and
-- AUD-034-b4c1-rollback.sql (0008). Reverse order of the forward migrations.
--
-- IMPORTANT
-- * Operator-run recovery script, NOT a Drizzle migration; it is not tracked in
--   the Drizzle journal.
-- * MySQL DDL auto-commits. The script is NOT atomic and NOT idempotent.
-- * Run on a verified backup/clone first, during a maintenance window, with
--   application writes stopped.
-- * After this script the database no longer enforces tenant ownership for
--   these five relations. A child row in village A may reference a parent in
--   village B again; only application-layer validation prevents it.
-- * Delete behavior is unchanged by this rollback: the forward migration and
--   the baseline both cascade.
-- * Do not use this script to repair a partially applied 0007. Inspect
--   information_schema and reconcile the live state manually.
--
-- Preconditions to verify manually:
--   1. Schema is at 0009 or later but no object from 0010/0011 is present, and
--      the 0008/0009 rollbacks have already been applied.
--   2. No statement from this script has already been applied.
--   3. A tested, restorable backup exists.
--   4. `_b4b_tenant_preflight_findings` / `_b4b_tenant_preflight_abort`
--      are absent. If present, a forward attempt aborted; inspect and drop
--      them manually before continuing.
--
-- Postconditions:
--   * 5 baseline single-column FKs exist again with ON DELETE CASCADE.
--   * The 5 *_tenant_fk constraints no longer exist.
--   * kontak_village_id_uq, kontak_grup_village_id_uq,
--     incoming_letters_village_id_uq, and outgoing_letters_village_id_uq no
--     longer exist. kelompok_village_id_uq is deliberately preserved: it comes
--     from migration 0003, not 0007.
--   * The villages CASCADE FKs stay covered by the pre-existing village_id
--     indexes (kontak_village_idx, kontak_grup_village_idx,
--     incoming_letters_village_received_idx,
--     outgoing_letters_village_letter_date_idx), so no replacement index is
--     needed.
--   * The 5 composite child indexes added by 0007 no longer exist. MySQL
--     re-creates the baseline `anggota_grup_kontak_kontak_id_kontak_id_fk`
--     index for the restored FK; the other four FKs reuse the surviving
--     baseline child indexes.
--   * No domain row is modified or deleted.
--
-- Execute statement-by-statement with stop-on-error. Do not continue after any
-- failure; reconcile the exact state first.

-- 1. Drop composite tenant FKs added by 0007.
ALTER TABLE `anggota_grup_kontak` DROP FOREIGN KEY `anggota_grup_kontak_kontak_tenant_fk`;
ALTER TABLE `anggota_grup_kontak` DROP FOREIGN KEY `anggota_grup_kontak_grup_tenant_fk`;
ALTER TABLE `incoming_letter_dispositions` DROP FOREIGN KEY `ild_incoming_letter_tenant_fk`;
ALTER TABLE `outgoing_letter_shipments` DROP FOREIGN KEY `ols_outgoing_letter_tenant_fk`;
ALTER TABLE `kelompok_anggota` DROP FOREIGN KEY `kelompok_anggota_kelompok_tenant_fk`;

-- 2. Drop the composite child indexes introduced by 0007.
DROP INDEX `anggota_grup_kontak_village_grup_idx` ON `anggota_grup_kontak`;
DROP INDEX `anggota_grup_kontak_village_kontak_idx` ON `anggota_grup_kontak`;
DROP INDEX `ild_village_letter_idx` ON `incoming_letter_dispositions`;
DROP INDEX `ols_village_letter_idx` ON `outgoing_letter_shipments`;
DROP INDEX `kelompok_anggota_village_kelompok_idx` ON `kelompok_anggota`;

-- 3. Drop the parent unique keys added by 0007. kelompok_village_id_uq is NOT
--    dropped here: it predates this batch (migration 0003).
ALTER TABLE `kontak` DROP INDEX `kontak_village_id_uq`;
ALTER TABLE `kontak_grup` DROP INDEX `kontak_grup_village_id_uq`;
ALTER TABLE `incoming_letters` DROP INDEX `incoming_letters_village_id_uq`;
ALTER TABLE `outgoing_letters` DROP INDEX `outgoing_letters_village_id_uq`;

-- 4. Restore the baseline single-column FKs (names and behavior from baseline).
ALTER TABLE `anggota_grup_kontak`
  ADD CONSTRAINT `anggota_grup_kontak_kontak_id_kontak_id_fk`
  FOREIGN KEY (`kontak_id`) REFERENCES `kontak` (`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE `anggota_grup_kontak`
  ADD CONSTRAINT `anggota_grup_kontak_grup_id_kontak_grup_id_fk`
  FOREIGN KEY (`grup_id`) REFERENCES `kontak_grup` (`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE `incoming_letter_dispositions`
  ADD CONSTRAINT `ild_incoming_letter_id_fk`
  FOREIGN KEY (`incoming_letter_id`) REFERENCES `incoming_letters` (`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE `outgoing_letter_shipments`
  ADD CONSTRAINT `ols_outgoing_letter_id_fk`
  FOREIGN KEY (`outgoing_letter_id`) REFERENCES `outgoing_letters` (`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE `kelompok_anggota`
  ADD CONSTRAINT `kelompok_anggota_kelompok_id_kelompok_id_fk`
  FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok` (`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Verification (read-only; expected values in comments).
--   SELECT CONSTRAINT_NAME, DELETE_RULE
--   FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'anggota_grup_kontak_kontak_id_kontak_id_fk',
--       'anggota_grup_kontak_grup_id_kontak_grup_id_fk',
--       'ild_incoming_letter_id_fk', 'ols_outgoing_letter_id_fk',
--       'kelompok_anggota_kelompok_id_kelompok_id_fk');
--   -- expect 5 rows, DELETE_RULE = 'CASCADE'
--
--   SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'anggota_grup_kontak_kontak_tenant_fk',
--       'anggota_grup_kontak_grup_tenant_fk',
--       'ild_incoming_letter_tenant_fk', 'ols_outgoing_letter_tenant_fk',
--       'kelompok_anggota_kelompok_tenant_fk');
--   -- expect 0
--
--   SELECT COUNT(*) FROM information_schema.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND INDEX_NAME IN (
--       'kontak_village_id_uq', 'kontak_grup_village_id_uq',
--       'incoming_letters_village_id_uq', 'outgoing_letters_village_id_uq',
--       'anggota_grup_kontak_village_grup_idx',
--       'anggota_grup_kontak_village_kontak_idx',
--       'ild_village_letter_idx', 'ols_village_letter_idx',
--       'kelompok_anggota_village_kelompok_idx');
--   -- expect 0
--
--   SELECT COUNT(*) FROM information_schema.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kelompok'
--     AND INDEX_NAME = 'kelompok_village_id_uq';
--   -- expect 1 (must survive the rollback)
