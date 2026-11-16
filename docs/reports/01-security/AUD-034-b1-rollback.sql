-- AUD-034 Batch B1 inverse migration (MySQL 8.0)
--
-- PURPOSE
-- Restore the eight original single-column SET NULL foreign keys from
-- 0000_baseline.sql and remove the objects added by
-- 0011_b1_set_null_relations_composite_fk.sql:
--   users.resident_id                 -> residents.id
--   family_member_logs.family_id      -> families.id
--   family_member_logs.resident_id    -> residents.id
--   pendapat.resident_id              -> residents.id
--   kontak.resident_id                -> residents.id
--   letter_number_archive.letter_id   -> letters.id
--   lapak.resident_id                 -> residents.id
--   notifikasi_terkirim.resident_id   -> residents.id
--
-- IMPORTANT
-- * This is an operator-run recovery script, NOT a Drizzle migration, and it is
--   not tracked in the Drizzle journal.
-- * MySQL DDL auto-commits. The script is NOT atomic and is NOT idempotent.
-- * Run only against a verified backup/clone first, during a maintenance window.
-- * Stop application writes before running it. Application code from Batch B1
--   is compatible with both schemas: the repositories clear the child column
--   (`NULL`) inside their own transaction before deleting the parent, which is
--   also valid when the database FK is SET NULL again.
-- * After this script the database no longer enforces tenant ownership for
--   these eight relations. A child row can reference a parent of another
--   village again; only application-layer validation prevents it (as before
--   Batch B1). Re-run `AUD-034-runbook-hapus-desa.md` checks accordingly.
-- * Do not run this script to recover a partially applied 0011 migration.
--   Inspect information_schema first and reconcile the live state manually.
--
-- Preconditions to verify manually:
--   1. Schema is fully at 0011_b1_set_null_relations_composite_fk.sql.
--   2. No statement from this script has already been applied.
--   3. A tested, restorable backup exists.
--   4. `_b1_tenant_preflight_findings` / `_b1_tenant_preflight_abort` are
--      absent. If present, a forward attempt aborted; inspect before
--      continuing and drop them manually.
--
-- Postconditions:
--   * 8 baseline single-column FKs exist again with ON DELETE SET NULL.
--   * The 8 *_tenant_fk constraints no longer exist.
--   * users_village_resident_idx, family_member_logs_village_family_idx,
--     family_member_logs_village_resident_idx, pendapat_village_resident_idx,
--     letter_number_archive_village_letter_idx, lapak_village_resident_idx and
--     notifikasi_village_resident_idx no longer exist. The pre-existing
--     kontak_village_resident_idx (baseline) is preserved.
--   * users and notifikasi_terkirim regain the single-column village_id index
--     the baseline MySQL auto-created for their villages FK
--     (users_village_id_villages_id_fk, notifikasi_terkirim_village_id_villages_id_fk).
--     Those indexes were absorbed when 0011 created the composite index, so
--     dropping the composite index without recreating them fails with errno
--     1553.
--   * No domain row is modified or deleted.
--
-- Execute statement-by-statement with stop-on-error. Do not continue after any
-- failure; reconcile the exact state first.

-- 1. Drop the eight composite tenant FKs added by 0011.
ALTER TABLE `users` DROP FOREIGN KEY `users_resident_tenant_fk`;
ALTER TABLE `family_member_logs` DROP FOREIGN KEY `family_member_logs_family_tenant_fk`;
ALTER TABLE `family_member_logs` DROP FOREIGN KEY `family_member_logs_resident_tenant_fk`;
ALTER TABLE `pendapat` DROP FOREIGN KEY `pendapat_resident_tenant_fk`;
ALTER TABLE `kontak` DROP FOREIGN KEY `kontak_resident_tenant_fk`;
ALTER TABLE `letter_number_archive` DROP FOREIGN KEY `letter_number_archive_letter_tenant_fk`;
ALTER TABLE `lapak` DROP FOREIGN KEY `lapak_resident_tenant_fk`;
ALTER TABLE `notifikasi_terkirim` DROP FOREIGN KEY `notifikasi_terkirim_resident_tenant_fk`;

-- 2. Recreate the village_id indexes the composite 0011 indexes absorbed. The
--    villages FKs need a leftmost village_id index; without these, step 3
--    fails with "Cannot drop index ...: needed in a foreign key constraint"
--    (errno 1553). Names follow the baseline auto-created convention.
CREATE INDEX `users_village_id_villages_id_fk` ON `users` (`village_id`);
CREATE INDEX `notifikasi_terkirim_village_id_villages_id_fk`
  ON `notifikasi_terkirim` (`village_id`);

-- 3. Drop the seven child indexes that 0011 introduced.
DROP INDEX `users_village_resident_idx` ON `users`;
DROP INDEX `family_member_logs_village_family_idx` ON `family_member_logs`;
DROP INDEX `family_member_logs_village_resident_idx` ON `family_member_logs`;
DROP INDEX `pendapat_village_resident_idx` ON `pendapat`;
DROP INDEX `letter_number_archive_village_letter_idx` ON `letter_number_archive`;
DROP INDEX `lapak_village_resident_idx` ON `lapak`;
DROP INDEX `notifikasi_village_resident_idx` ON `notifikasi_terkirim`;

-- 4. Restore the baseline single-column FKs (names and behavior from
--    baseline). Existing single-column child indexes are reused; MySQL only
--    auto-creates an index when none covers the column.
ALTER TABLE `users`
  ADD CONSTRAINT `users_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `family_member_logs`
  ADD CONSTRAINT `family_member_logs_family_id_families_id_fk`
  FOREIGN KEY (`family_id`) REFERENCES `families` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `family_member_logs`
  ADD CONSTRAINT `family_member_logs_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `pendapat`
  ADD CONSTRAINT `pendapat_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `kontak`
  ADD CONSTRAINT `kontak_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `letter_number_archive`
  ADD CONSTRAINT `letter_number_archive_letter_id_letters_id_fk`
  FOREIGN KEY (`letter_id`) REFERENCES `letters` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `lapak`
  ADD CONSTRAINT `lapak_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `notifikasi_terkirim`
  ADD CONSTRAINT `notifikasi_terkirim_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- Verification (read-only; expected values in comments).
--   SELECT CONSTRAINT_NAME, DELETE_RULE
--   FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'users_resident_id_residents_id_fk',
--       'family_member_logs_family_id_families_id_fk',
--       'family_member_logs_resident_id_residents_id_fk',
--       'pendapat_resident_id_residents_id_fk',
--       'kontak_resident_id_residents_id_fk',
--       'letter_number_archive_letter_id_letters_id_fk',
--       'lapak_resident_id_residents_id_fk',
--       'notifikasi_terkirim_resident_id_residents_id_fk');
--   -- expect 8 rows, DELETE_RULE = 'SET NULL'
--
--   SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
--   WHERE CONSTRAINT_SCHEMA = DATABASE()
--     AND CONSTRAINT_NAME IN (
--       'users_resident_tenant_fk','family_member_logs_family_tenant_fk',
--       'family_member_logs_resident_tenant_fk','pendapat_resident_tenant_fk',
--       'kontak_resident_tenant_fk','letter_number_archive_letter_tenant_fk',
--       'lapak_resident_tenant_fk','notifikasi_terkirim_resident_tenant_fk');
--   -- expect 0
--
--   SELECT COUNT(*) FROM information_schema.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND INDEX_NAME IN ('users_village_resident_idx',
--                        'family_member_logs_village_family_idx',
--                        'family_member_logs_village_resident_idx',
--                        'pendapat_village_resident_idx',
--                        'letter_number_archive_village_letter_idx',
--                        'lapak_village_resident_idx',
--                        'notifikasi_village_resident_idx');
--   -- expect 0
--
--   SELECT COUNT(*) FROM information_schema.STATISTICS
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND INDEX_NAME IN ('users_village_id_villages_id_fk',
--                        'notifikasi_terkirim_village_id_villages_id_fk');
--   -- expect 2
