-- AUD-036: tegakkan kepemilikan tenant pada `survey_soal.indikator_id`.
--
-- Sebelumnya kolom ini hanya memiliki FK satu kolom ke `analisis_indikator.id`,
-- sehingga soal milik desa A dapat menunjuk indikator desa B bila jalur tulis
-- melewati validasi application layer. Composite FK menyertakan `village_id`
-- pada kedua sisi; parent mendapat UNIQUE (village_id, id) sebagai target.
--
-- `ON DELETE SET NULL` tidak dapat dipakai pada composite FK karena akan ikut
-- mengosongkan `village_id` yang NOT NULL. FK memakai RESTRICT; repository
-- `deleteAnalisisIndikator` melepas referensi soal sewilayah dalam transaksi
-- sebelum menghapus indikator, sehingga perilaku bisnis tetap setara.
--
-- Preflight hanya membaca data domain dan menulis temuan ke tabel sementara.
-- Bila ada referensi lintas desa, statement pemicu gagal (duplicate key)
-- sehingga migration berhenti sebelum constraint diubah dan tidak ada data
-- domain yang diubah, di-backfill, atau dihapus.
DROP TABLE IF EXISTS `_sitfk_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_sitfk_preflight_findings`;
--> statement-breakpoint
CREATE TABLE `_sitfk_preflight_findings` (
  `relasi` varchar(100) NOT NULL,
  `jenis` varchar(16) NOT NULL,
  `jumlah` bigint NOT NULL,
  `kode_pesan` varchar(48) NOT NULL,
  PRIMARY KEY (`relasi`, `jenis`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_sitfk_preflight_findings` (`relasi`, `jenis`, `jumlah`, `kode_pesan`)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'survey_soal.indikator_id' AS relasi, 'cross-tenant' AS jenis,
         COUNT(*) AS jumlah, 'survey_soal.indikator' AS kode_pesan
  FROM `survey_soal` AS s
  JOIN `analisis_indikator` AS i ON i.id = s.indikator_id
  WHERE s.indikator_id IS NOT NULL
    AND i.village_id <> s.village_id
  UNION ALL
  SELECT 'survey_soal.indikator_id', 'orphan', COUNT(*), 'survey_soal.indikator'
  FROM `survey_soal` AS s
  LEFT JOIN `analisis_indikator` AS i ON i.id = s.indikator_id
  WHERE s.indikator_id IS NOT NULL AND i.id IS NULL
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE `_sitfk_preflight_abort` (
  `pesan` varchar(72) NOT NULL,
  PRIMARY KEY (`pesan`)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error menghentikan migration sambil mempertahankan temuan.
INSERT INTO `_sitfk_preflight_abort` (`pesan`)
SELECT CONCAT(kode_pesan, ' ', jenis, '=', jumlah)
FROM `_sitfk_preflight_findings`;
--> statement-breakpoint
INSERT INTO `_sitfk_preflight_abort` (`pesan`)
SELECT CONCAT(kode_pesan, ' ', jenis, '=', jumlah)
FROM `_sitfk_preflight_findings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_sitfk_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_sitfk_preflight_findings`;
--> statement-breakpoint
ALTER TABLE `survey_soal` DROP FOREIGN KEY `survey_soal_indikator_id_analisis_indikator_id_fk`;
--> statement-breakpoint
ALTER TABLE `analisis_indikator` ADD CONSTRAINT `analisis_indikator_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
-- Index anak dibuat sebelum composite FK agar InnoDB tidak membuat index
-- implisit dengan nama constraint.
CREATE INDEX `survey_soal_village_indikator_idx` ON `survey_soal` (`village_id`,`indikator_id`);
--> statement-breakpoint
ALTER TABLE `survey_soal` ADD CONSTRAINT `survey_soal_indikator_tenant_fk` FOREIGN KEY (`village_id`,`indikator_id`) REFERENCES `analisis_indikator`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
