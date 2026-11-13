-- B2 inverse migration (MySQL 8.0)
--
-- PURPOSE
-- Restore the nine single-column DTKS/Suplemen foreign keys and their original
-- ON DELETE behavior from 0000_baseline.sql, remove `dtks_ref_lampiran.village_id`,
-- and drop the objects added by 0002_b2_dtks_suplemen_composite_fk.sql.
--
-- IMPORTANT
-- * This is an operator-run recovery script, NOT a Drizzle migration.
-- * MySQL DDL auto-commits. The script is NOT atomic and is NOT idempotent.
-- * Run only against a verified backup/clone first, during a maintenance window.
-- * Stop application writes and confirm the application rollback plan first.
-- * Do not run this script to recover a partially applied 0002 migration:
--   inspect information_schema and reconcile the exact live state manually.
-- * The script removes tenant-level composite enforcement for DTKS/Suplemen.
--   Cross-tenant references become possible again after it completes.
-- * For `dtks_ref_lampiran`, dropping `village_id` also discards the desa of
--   each existing junction row. Re-applying 0002 re-derives it from the DTKS
--   parent, so no business data is lost, but any manual correction to
--   junction village_id is lost.
--
-- Preconditions to verify manually:
--   1. Current schema is fully at 0002_b2_dtks_suplemen_composite_fk.sql.
--   2. No statement from this script has already been applied.
--   3. A tested, restorable backup exists.
--   4. Application version compatibility has been reviewed: the application
--      transaction in `deleteKeluarga`/`deletePenduduk` sets NULL explicitly,
--      which is also valid against the restored `SET NULL` FKs.
--   5. `_b2_preflight_findings` is absent; if it exists, a forward attempt
--      aborted. Inspect it before continuing, then drop it manually.
--
-- Postconditions:
--   * dtks_ref_lampiran has no village_id column and 2 baseline FKs.
--   * 9 baseline single-column FKs exist with baseline delete actions.
--   * 9 *_tenant_fk constraints no longer exist.
--   * suplemen_terdata_village_id_villages_id_fk exists again with its
--     auto-created index named after the constraint (as in baseline).
--   * 3 *_village_id_uq unique keys and 8 explicit B2 indexes no longer exist.
--
-- Execute statement-by-statement with stop-on-error. Do not continue after any
-- failed ALTER; inspect information_schema before deciding next action.

-- 0. Helper tables left behind by an aborted forward attempt (normally absent).
DROP TABLE IF EXISTS `_b2_preflight_abort`;
DROP TABLE IF EXISTS `_b2_preflight_findings`;

-- 1. Drop composite foreign keys added by 0002.
ALTER TABLE `dtks` DROP FOREIGN KEY `dtks_rtm_tenant_fk`;
ALTER TABLE `dtks` DROP FOREIGN KEY `dtks_keluarga_tenant_fk`;
ALTER TABLE `dtks_anggota` DROP FOREIGN KEY `dtks_anggota_dtks_tenant_fk`;
ALTER TABLE `dtks_anggota` DROP FOREIGN KEY `dtks_anggota_penduduk_tenant_fk`;
ALTER TABLE `dtks_ref_lampiran` DROP FOREIGN KEY `dtks_ref_lampiran_dtks_tenant_fk`;
ALTER TABLE `dtks_ref_lampiran` DROP FOREIGN KEY `dtks_ref_lampiran_lampiran_tenant_fk`;
ALTER TABLE `dtks_ref_lampiran` DROP FOREIGN KEY `dtks_ref_lampiran_village_id_villages_id_fk`;
ALTER TABLE `suplemen_terdata` DROP FOREIGN KEY `suplemen_terdata_suplemen_tenant_fk`;
ALTER TABLE `suplemen_terdata` DROP FOREIGN KEY `suplemen_terdata_penduduk_tenant_fk`;
ALTER TABLE `suplemen_terdata` DROP FOREIGN KEY `suplemen_terdata_keluarga_tenant_fk`;
-- FK `village_id -> villages` ikut dilepas: setelah 0002, index pendukungnya
-- adalah salah satu index composite di bawah (MySQL membuang index otomatis
-- yang lama karena dianggap redundan), sehingga index itu tidak dapat di-drop
-- selama FK masih ada. FK ditambahkan kembali pada langkah 2b.
ALTER TABLE `suplemen_terdata` DROP FOREIGN KEY `suplemen_terdata_village_id_villages_id_fk`;

-- 2. Drop explicit composite support indexes created by 0002.
ALTER TABLE `dtks` DROP INDEX `dtks_village_keluarga_idx`;
ALTER TABLE `dtks_anggota` DROP INDEX `dtks_anggota_village_dtks_idx`;
ALTER TABLE `dtks_anggota` DROP INDEX `dtks_anggota_village_penduduk_idx`;
ALTER TABLE `dtks_ref_lampiran` DROP INDEX `dtks_ref_lampiran_village_dtks_idx`;
ALTER TABLE `dtks_ref_lampiran` DROP INDEX `dtks_ref_lampiran_village_lampiran_idx`;
ALTER TABLE `suplemen_terdata` DROP INDEX `suplemen_terdata_village_suplemen_idx`;
ALTER TABLE `suplemen_terdata` DROP INDEX `suplemen_terdata_village_penduduk_idx`;
ALTER TABLE `suplemen_terdata` DROP INDEX `suplemen_terdata_village_keluarga_idx`;

-- 2b. Pulihkan FK desa `suplemen_terdata`; MySQL membuat kembali index otomatis
-- dengan nama constraint yang sama seperti pada 0000_baseline.sql.
ALTER TABLE `suplemen_terdata` ADD CONSTRAINT `suplemen_terdata_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;

-- 3. Drop parent unique keys created by 0002.
ALTER TABLE `dtks` DROP INDEX `dtks_village_id_uq`;
ALTER TABLE `dtks_lampiran` DROP INDEX `dtks_lampiran_village_id_uq`;
ALTER TABLE `suplemen` DROP INDEX `suplemen_village_id_uq`;

-- 4. Drop the junction tenant column (last, after all FKs/indexes using it).
ALTER TABLE `dtks_ref_lampiran` DROP COLUMN `village_id`;

-- 5. Restore baseline single-column foreign keys and their delete actions.
ALTER TABLE `dtks` ADD CONSTRAINT `dtks_rtm_id_rtm_id_fk` FOREIGN KEY (`rtm_id`) REFERENCES `rtm`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `dtks` ADD CONSTRAINT `dtks_keluarga_id_families_id_fk` FOREIGN KEY (`keluarga_id`) REFERENCES `families`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `dtks_anggota` ADD CONSTRAINT `dtks_anggota_dtks_id_dtks_id_fk` FOREIGN KEY (`dtks_id`) REFERENCES `dtks`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `dtks_anggota` ADD CONSTRAINT `dtks_anggota_penduduk_id_residents_id_fk` FOREIGN KEY (`penduduk_id`) REFERENCES `residents`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `dtks_ref_lampiran` ADD CONSTRAINT `dtks_ref_lampiran_dtks_id_dtks_id_fk` FOREIGN KEY (`dtks_id`) REFERENCES `dtks`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `dtks_ref_lampiran` ADD CONSTRAINT `dtks_ref_lampiran_lampiran_id_dtks_lampiran_id_fk` FOREIGN KEY (`lampiran_id`) REFERENCES `dtks_lampiran`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `suplemen_terdata` ADD CONSTRAINT `suplemen_terdata_id_suplemen_suplemen_id_fk` FOREIGN KEY (`id_suplemen`) REFERENCES `suplemen`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `suplemen_terdata` ADD CONSTRAINT `suplemen_terdata_penduduk_id_residents_id_fk` FOREIGN KEY (`penduduk_id`) REFERENCES `residents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `suplemen_terdata` ADD CONSTRAINT `suplemen_terdata_keluarga_id_families_id_fk` FOREIGN KEY (`keluarga_id`) REFERENCES `families`(`id`) ON DELETE set null ON UPDATE no action;
