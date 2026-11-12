-- AUD-002 inverse migration (MySQL 8.0)
--
-- PURPOSE
-- Restore the 19 single-column foreign keys and their original ON DELETE
-- behavior from 0000_baseline.sql after 0001_aud002_composite_tenant_fk.sql.
--
-- IMPORTANT
-- * This is an operator-run recovery script, NOT a Drizzle migration.
-- * MySQL DDL auto-commits. The script is NOT atomic and is NOT idempotent.
-- * Run only against a verified backup/clone first, during a maintenance window.
-- * Stop application writes and confirm the application rollback plan first.
-- * Do not run this script to recover a partially applied 0001 migration:
--   inspect information_schema and reconcile the exact live state manually.
-- * The script removes tenant-level composite enforcement. Cross-tenant
--   references may become possible again after it completes.
--
-- Preconditions to verify manually:
--   1. Current schema is fully at 0001_aud002_composite_tenant_fk.sql.
--   2. No DDL from this script has already been applied.
--   3. A tested, restorable backup exists.
--   4. Application version compatibility has been reviewed.
--
-- Postconditions:
--   * 19 original single-column FKs exist with baseline delete actions.
--   * 19 *_tenant_fk constraints no longer exist.
--   * 8 *_village_id_uq unique keys no longer exist.
--   * 3 explicitly-created AUD-002 composite indexes no longer exist.
--   * 14 implicit MySQL child indexes created for composite FKs no longer exist.
--
-- Execute statement-by-statement with stop-on-error. Do not continue after
-- any failed ALTER; inspect information_schema before deciding next action.

-- 1. Drop all composite foreign keys.
ALTER TABLE `families` DROP FOREIGN KEY `families_region_tenant_fk`;
ALTER TABLE `bulanan_anak` DROP FOREIGN KEY `bulanan_anak_posyandu_tenant_fk`;
ALTER TABLE `bulanan_anak` DROP FOREIGN KEY `bulanan_anak_kia_tenant_fk`;
ALTER TABLE `ibu_hamil` DROP FOREIGN KEY `ibu_hamil_posyandu_tenant_fk`;
ALTER TABLE `ibu_hamil` DROP FOREIGN KEY `ibu_hamil_kia_tenant_fk`;
ALTER TABLE `kia` DROP FOREIGN KEY `kia_ibu_tenant_fk`;
ALTER TABLE `kia` DROP FOREIGN KEY `kia_anak_tenant_fk`;
ALTER TABLE `letters` DROP FOREIGN KEY `letters_type_tenant_fk`;
ALTER TABLE `letters` DROP FOREIGN KEY `letters_resident_tenant_fk`;
ALTER TABLE `permohonan_surat` DROP FOREIGN KEY `permohonan_surat_resident_tenant_fk`;
ALTER TABLE `permohonan_surat` DROP FOREIGN KEY `permohonan_surat_type_tenant_fk`;
ALTER TABLE `permohonan_surat` DROP FOREIGN KEY `permohonan_surat_letter_tenant_fk`;
ALTER TABLE `residents` DROP FOREIGN KEY `residents_family_tenant_fk`;
ALTER TABLE `residents` DROP FOREIGN KEY `residents_rtm_tenant_fk`;
ALTER TABLE `residents` DROP FOREIGN KEY `residents_region_tenant_fk`;
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_resident_tenant_fk`;
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_from_region_tenant_fk`;
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_to_region_tenant_fk`;
ALTER TABLE `rtm` DROP FOREIGN KEY `rtm_region_tenant_fk`;

-- 2. Restore the original single-column foreign keys and delete actions
--    exactly as defined in 0000_baseline.sql.
ALTER TABLE `families`
  ADD CONSTRAINT `families_region_id_regions_id_fk`
  FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `bulanan_anak`
  ADD CONSTRAINT `bulanan_anak_posyandu_id_posyandu_id_fk`
  FOREIGN KEY (`posyandu_id`) REFERENCES `posyandu`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `bulanan_anak`
  ADD CONSTRAINT `bulanan_anak_kia_id_kia_id_fk`
  FOREIGN KEY (`kia_id`) REFERENCES `kia`(`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE `ibu_hamil`
  ADD CONSTRAINT `ibu_hamil_posyandu_id_posyandu_id_fk`
  FOREIGN KEY (`posyandu_id`) REFERENCES `posyandu`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `ibu_hamil`
  ADD CONSTRAINT `ibu_hamil_kia_id_kia_id_fk`
  FOREIGN KEY (`kia_id`) REFERENCES `kia`(`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE `kia`
  ADD CONSTRAINT `kia_ibu_id_residents_id_fk`
  FOREIGN KEY (`ibu_id`) REFERENCES `residents`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `kia`
  ADD CONSTRAINT `kia_anak_id_residents_id_fk`
  FOREIGN KEY (`anak_id`) REFERENCES `residents`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `letters`
  ADD CONSTRAINT `letters_type_id_letter_types_id_fk`
  FOREIGN KEY (`type_id`) REFERENCES `letter_types`(`id`)
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `letters`
  ADD CONSTRAINT `letters_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `permohonan_surat`
  ADD CONSTRAINT `permohonan_surat_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `permohonan_surat`
  ADD CONSTRAINT `permohonan_surat_letter_type_id_letter_types_id_fk`
  FOREIGN KEY (`letter_type_id`) REFERENCES `letter_types`(`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `permohonan_surat`
  ADD CONSTRAINT `permohonan_surat_letter_id_letters_id_fk`
  FOREIGN KEY (`letter_id`) REFERENCES `letters`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `residents`
  ADD CONSTRAINT `residents_family_id_families_id_fk`
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `residents`
  ADD CONSTRAINT `residents_rtm_id_rtm_id_fk`
  FOREIGN KEY (`rtm_id`) REFERENCES `rtm`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `residents`
  ADD CONSTRAINT `residents_region_id_regions_id_fk`
  FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `resident_mutations`
  ADD CONSTRAINT `resident_mutations_resident_id_residents_id_fk`
  FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `resident_mutations`
  ADD CONSTRAINT `resident_mutations_from_region_id_regions_id_fk`
  FOREIGN KEY (`from_region_id`) REFERENCES `regions`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `resident_mutations`
  ADD CONSTRAINT `resident_mutations_to_region_id_regions_id_fk`
  FOREIGN KEY (`to_region_id`) REFERENCES `regions`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `rtm`
  ADD CONSTRAINT `rtm_region_id_regions_id_fk`
  FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- 3. Drop the implicit indexes MySQL created for composite foreign keys whose
--    child table had no index with (village_id, parent_id) as a leading prefix.
--    These indexes survive DROP FOREIGN KEY and are not part of the baseline.
DROP INDEX `bulanan_anak_kia_tenant_fk` ON `bulanan_anak`;
DROP INDEX `bulanan_anak_posyandu_tenant_fk` ON `bulanan_anak`;
DROP INDEX `families_region_tenant_fk` ON `families`;
DROP INDEX `ibu_hamil_kia_tenant_fk` ON `ibu_hamil`;
DROP INDEX `ibu_hamil_posyandu_tenant_fk` ON `ibu_hamil`;
DROP INDEX `kia_anak_tenant_fk` ON `kia`;
DROP INDEX `kia_ibu_tenant_fk` ON `kia`;
DROP INDEX `letters_resident_tenant_fk` ON `letters`;
DROP INDEX `permohonan_surat_letter_tenant_fk` ON `permohonan_surat`;
DROP INDEX `permohonan_surat_resident_tenant_fk` ON `permohonan_surat`;
DROP INDEX `permohonan_surat_type_tenant_fk` ON `permohonan_surat`;
DROP INDEX `residents_region_tenant_fk` ON `residents`;
DROP INDEX `residents_rtm_tenant_fk` ON `residents`;
DROP INDEX `rtm_region_tenant_fk` ON `rtm`;

-- 4. Remove only the three indexes introduced explicitly by AUD-002.
DROP INDEX `resident_mutations_village_resident_idx` ON `resident_mutations`;
DROP INDEX `resident_mutations_village_from_region_idx` ON `resident_mutations`;
DROP INDEX `resident_mutations_village_to_region_idx` ON `resident_mutations`;

-- 5. Remove the eight parent unique keys introduced by AUD-002.
ALTER TABLE `families` DROP INDEX `families_village_id_uq`;
ALTER TABLE `kia` DROP INDEX `kia_village_id_uq`;
ALTER TABLE `posyandu` DROP INDEX `posyandu_village_id_uq`;
ALTER TABLE `letter_types` DROP INDEX `letter_types_village_id_uq`;
ALTER TABLE `letters` DROP INDEX `letters_village_id_uq`;
ALTER TABLE `regions` DROP INDEX `regions_village_id_uq`;
ALTER TABLE `residents` DROP INDEX `residents_village_id_uq`;
ALTER TABLE `rtm` DROP INDEX `rtm_village_id_uq`;

-- 6. Verify manually using information_schema. Include both explicit AUD-002
--    indexes and implicit indexes named after *_tenant_fk constraints:
--    SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME,
--           REFERENCED_COLUMN_NAME
--    FROM information_schema.KEY_COLUMN_USAGE
--    WHERE CONSTRAINT_SCHEMA = DATABASE()
--      AND REFERENCED_TABLE_NAME IS NOT NULL
--      AND (CONSTRAINT_NAME LIKE '%_tenant_fk'
--           OR CONSTRAINT_NAME IN (
--             'families_region_id_regions_id_fk',
--             'bulanan_anak_posyandu_id_posyandu_id_fk',
--             'bulanan_anak_kia_id_kia_id_fk',
--             'ibu_hamil_posyandu_id_posyandu_id_fk',
--             'ibu_hamil_kia_id_kia_id_fk',
--             'kia_ibu_id_residents_id_fk',
--             'kia_anak_id_residents_id_fk',
--             'letters_type_id_letter_types_id_fk',
--             'letters_resident_id_residents_id_fk',
--             'permohonan_surat_resident_id_residents_id_fk',
--             'permohonan_surat_letter_type_id_letter_types_id_fk',
--             'permohonan_surat_letter_id_letters_id_fk',
--             'residents_family_id_families_id_fk',
--             'residents_rtm_id_rtm_id_fk',
--             'residents_region_id_regions_id_fk',
--             'resident_mutations_resident_id_residents_id_fk',
--             'resident_mutations_from_region_id_regions_id_fk',
--             'resident_mutations_to_region_id_regions_id_fk',
--             'rtm_region_id_regions_id_fk'
--           ))
--    ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;
