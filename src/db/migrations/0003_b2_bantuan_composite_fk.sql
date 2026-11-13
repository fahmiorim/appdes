-- B2 — Composite tenant FK untuk peserta program bantuan.
--
-- Seluruh referensi peserta wajib menunjuk parent pada village_id yang sama.
-- Preflight menghentikan migration sebelum perubahan constraint bila ditemukan
-- orphan atau cross-tenant reference. Tidak ada data domain yang diubah.
DROP TABLE IF EXISTS `_b2_bantuan_preflight_findings`;
--> statement-breakpoint
CREATE TABLE `_b2_bantuan_preflight_findings` (
  `relasi` varchar(64) NOT NULL,
  `jenis` varchar(16) NOT NULL,
  `jumlah` bigint NOT NULL,
  PRIMARY KEY (`relasi`, `jenis`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b2_bantuan_preflight_findings` (`relasi`, `jenis`, `jumlah`)
SELECT t.relasi, t.jenis, t.jumlah
FROM (
  SELECT 'bantuan_peserta.program_id' AS relasi, 'orphan' AS jenis, COUNT(*) AS jumlah
  FROM `bantuan_peserta` AS c
  LEFT JOIN `bantuan_program` AS p ON p.id = c.program_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'bantuan_peserta.program_id', 'cross-tenant', COUNT(*)
  FROM `bantuan_peserta` AS c
  JOIN `bantuan_program` AS p ON p.id = c.program_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'bantuan_peserta.resident_id', 'orphan', COUNT(*)
  FROM `bantuan_peserta` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.resident_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'bantuan_peserta.resident_id', 'cross-tenant', COUNT(*)
  FROM `bantuan_peserta` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'bantuan_peserta.family_id', 'orphan', COUNT(*)
  FROM `bantuan_peserta` AS c
  LEFT JOIN `families` AS p ON p.id = c.family_id
  WHERE c.family_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'bantuan_peserta.family_id', 'cross-tenant', COUNT(*)
  FROM `bantuan_peserta` AS c
  JOIN `families` AS p ON p.id = c.family_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'bantuan_peserta.rtm_id', 'orphan', COUNT(*)
  FROM `bantuan_peserta` AS c
  LEFT JOIN `rtm` AS p ON p.id = c.rtm_id
  WHERE c.rtm_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'bantuan_peserta.rtm_id', 'cross-tenant', COUNT(*)
  FROM `bantuan_peserta` AS c
  JOIN `rtm` AS p ON p.id = c.rtm_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'bantuan_peserta.kelompok_id', 'orphan', COUNT(*)
  FROM `bantuan_peserta` AS c
  LEFT JOIN `kelompok` AS p ON p.id = c.kelompok_id
  WHERE c.kelompok_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'bantuan_peserta.kelompok_id', 'cross-tenant', COUNT(*)
  FROM `bantuan_peserta` AS c
  JOIN `kelompok` AS p ON p.id = c.kelompok_id
  WHERE p.village_id <> c.village_id
) AS t
WHERE t.jumlah > 0;
--> statement-breakpoint
-- Pemicu gagal-closed tanpa stored routine: duplicate primary key memaksa
-- MySQL berhenti dengan pesan relasi/jenis/jumlah bila preflight menemukan data.
DROP TABLE IF EXISTS `_b2_bantuan_preflight_abort`;
--> statement-breakpoint
CREATE TABLE `_b2_bantuan_preflight_abort` (
  `pesan` varchar(255) NOT NULL,
  PRIMARY KEY (`pesan`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b2_bantuan_preflight_abort` (`pesan`)
SELECT CONCAT('B2 Bantuan preflight gagal: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b2_bantuan_preflight_findings`
UNION ALL
SELECT CONCAT('B2 Bantuan preflight gagal: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b2_bantuan_preflight_findings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b2_bantuan_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b2_bantuan_preflight_findings`;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` DROP FOREIGN KEY `bantuan_peserta_program_id_bantuan_program_id_fk`;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` DROP FOREIGN KEY `bantuan_peserta_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` DROP FOREIGN KEY `bantuan_peserta_family_id_families_id_fk`;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` DROP FOREIGN KEY `bantuan_peserta_rtm_id_rtm_id_fk`;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` DROP FOREIGN KEY `bantuan_peserta_kelompok_id_kelompok_id_fk`;
--> statement-breakpoint
ALTER TABLE `bantuan_program` ADD CONSTRAINT `bantuan_program_village_id_uq` UNIQUE (`village_id`, `id`);
--> statement-breakpoint
ALTER TABLE `kelompok` ADD CONSTRAINT `kelompok_village_id_uq` UNIQUE (`village_id`, `id`);
--> statement-breakpoint
CREATE INDEX `bantuan_peserta_village_program_idx` ON `bantuan_peserta` (`village_id`, `program_id`);
--> statement-breakpoint
CREATE INDEX `bantuan_peserta_village_resident_idx` ON `bantuan_peserta` (`village_id`, `resident_id`);
--> statement-breakpoint
CREATE INDEX `bantuan_peserta_village_family_idx` ON `bantuan_peserta` (`village_id`, `family_id`);
--> statement-breakpoint
CREATE INDEX `bantuan_peserta_village_rtm_idx` ON `bantuan_peserta` (`village_id`, `rtm_id`);
--> statement-breakpoint
CREATE INDEX `bantuan_peserta_village_kelompok_idx` ON `bantuan_peserta` (`village_id`, `kelompok_id`);
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` ADD CONSTRAINT `bantuan_peserta_program_tenant_fk` FOREIGN KEY (`village_id`, `program_id`) REFERENCES `bantuan_program` (`village_id`, `id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` ADD CONSTRAINT `bantuan_peserta_resident_tenant_fk` FOREIGN KEY (`village_id`, `resident_id`) REFERENCES `residents` (`village_id`, `id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` ADD CONSTRAINT `bantuan_peserta_family_tenant_fk` FOREIGN KEY (`village_id`, `family_id`) REFERENCES `families` (`village_id`, `id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` ADD CONSTRAINT `bantuan_peserta_rtm_tenant_fk` FOREIGN KEY (`village_id`, `rtm_id`) REFERENCES `rtm` (`village_id`, `id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `bantuan_peserta` ADD CONSTRAINT `bantuan_peserta_kelompok_tenant_fk` FOREIGN KEY (`village_id`, `kelompok_id`) REFERENCES `kelompok` (`village_id`, `id`) ON DELETE CASCADE ON UPDATE NO ACTION;
