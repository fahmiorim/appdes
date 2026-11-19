-- AUD-034 lanjutan: denormalisasi `village_id` ke tabel anak survey dan dokumentasi pembangunan.
--
-- Sebelumnya isolasi tenant tabel anak hanya dijaga dengan join ke induk di
-- application layer. Migration ini menambah `village_id` pada
-- `survey_soal`, `survey_responden`, `survey_jawaban`, dan
-- `pembangunan_dokumentasi`, mengisinya dari induk, lalu menegakkan isolasi
-- dengan composite foreign key `(village_id, <parent_id>)`.
--
-- Urutan sengaja data-safe: kolom ditambah nullable, di-backfill, diperiksa,
-- baru dijadikan NOT NULL dan diberi constraint. Guard memakai duplicate-key
-- error agar migration berhenti sebelum constraint berubah bila masih ada
-- baris tanpa induk atau jawaban yang menunjuk soal/responden beda tenant.

DROP TABLE IF EXISTS _tct_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _tct_tenant_preflight_findings;
--> statement-breakpoint
ALTER TABLE `pembangunan_dokumentasi` ADD `village_id` int NULL;
--> statement-breakpoint
ALTER TABLE `survey_jawaban` ADD `village_id` int NULL;
--> statement-breakpoint
ALTER TABLE `survey_responden` ADD `village_id` int NULL;
--> statement-breakpoint
ALTER TABLE `survey_soal` ADD `village_id` int NULL;
--> statement-breakpoint
UPDATE `survey_soal` c JOIN `survey` p ON p.`id` = c.`survey_id`
SET c.`village_id` = p.`village_id`
WHERE c.`village_id` IS NULL;
--> statement-breakpoint
UPDATE `survey_responden` c JOIN `survey` p ON p.`id` = c.`survey_id`
SET c.`village_id` = p.`village_id`
WHERE c.`village_id` IS NULL;
--> statement-breakpoint
UPDATE `survey_jawaban` c JOIN `survey_soal` p ON p.`id` = c.`soal_id`
SET c.`village_id` = p.`village_id`
WHERE c.`village_id` IS NULL;
--> statement-breakpoint
UPDATE `pembangunan_dokumentasi` c JOIN `pembangunan_proyek` p ON p.`id` = c.`proyek_id`
SET c.`village_id` = p.`village_id`
WHERE c.`village_id` IS NULL;
--> statement-breakpoint
CREATE TABLE _tct_tenant_preflight_findings (
  relasi varchar(100) NOT NULL,
  jenis varchar(16) NOT NULL,
  jumlah bigint NOT NULL,
  kode_pesan varchar(64) NOT NULL,
  PRIMARY KEY (relasi, jenis)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO _tct_tenant_preflight_findings (relasi, jenis, jumlah, kode_pesan)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'survey_soal.village_id' relasi, 'orphan' jenis, COUNT(*) jumlah, 'TCT survey_soal tanpa induk' kode_pesan
  FROM survey_soal WHERE village_id IS NULL
  UNION ALL
  SELECT 'survey_responden.village_id', 'orphan', COUNT(*), 'TCT survey_responden tanpa induk'
  FROM survey_responden WHERE village_id IS NULL
  UNION ALL
  SELECT 'survey_jawaban.village_id', 'orphan', COUNT(*), 'TCT survey_jawaban tanpa soal'
  FROM survey_jawaban WHERE village_id IS NULL
  UNION ALL
  SELECT 'pembangunan_dokumentasi.village_id', 'orphan', COUNT(*), 'TCT dokumentasi tanpa proyek'
  FROM pembangunan_dokumentasi WHERE village_id IS NULL
  UNION ALL
  SELECT 'survey_jawaban.responden_id', 'cross-tenant', COUNT(*), 'TCT jawaban beda tenant responden'
  FROM survey_jawaban j
  JOIN survey_responden r ON r.id = j.responden_id
  WHERE r.village_id <> j.village_id
  UNION ALL
  SELECT 'survey_jawaban.soal_id', 'cross-tenant', COUNT(*), 'TCT jawaban beda tenant soal'
  FROM survey_jawaban j
  JOIN survey_soal s ON s.id = j.soal_id
  WHERE s.village_id <> j.village_id
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE _tct_tenant_preflight_abort (
  pesan varchar(64) NOT NULL,
  PRIMARY KEY (pesan)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error stops the migration while preserving findings above.
INSERT INTO _tct_tenant_preflight_abort (pesan)
SELECT CONCAT(kode_pesan, ' (', jenis, '=', jumlah, ')') FROM _tct_tenant_preflight_findings;
--> statement-breakpoint
INSERT INTO _tct_tenant_preflight_abort (pesan)
SELECT CONCAT(kode_pesan, ' (', jenis, '=', jumlah, ')') FROM _tct_tenant_preflight_findings;
--> statement-breakpoint
DROP TABLE IF EXISTS _tct_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _tct_tenant_preflight_findings;
--> statement-breakpoint
ALTER TABLE `pembangunan_dokumentasi` MODIFY `village_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `survey_jawaban` MODIFY `village_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `survey_responden` MODIFY `village_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `survey_soal` MODIFY `village_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `pembangunan_dokumentasi` DROP FOREIGN KEY `pembangunan_dokumentasi_proyek_id_pembangunan_proyek_id_fk`;
--> statement-breakpoint
ALTER TABLE `survey_jawaban` DROP FOREIGN KEY `survey_jawaban_responden_id_survey_responden_id_fk`;
--> statement-breakpoint
ALTER TABLE `survey_jawaban` DROP FOREIGN KEY `survey_jawaban_soal_id_survey_soal_id_fk`;
--> statement-breakpoint
ALTER TABLE `survey_responden` DROP FOREIGN KEY `survey_responden_survey_id_survey_id_fk`;
--> statement-breakpoint
ALTER TABLE `survey_soal` DROP FOREIGN KEY `survey_soal_survey_id_survey_id_fk`;
--> statement-breakpoint
DROP INDEX `pembangunan_dokumentasi_proyek_idx` ON `pembangunan_dokumentasi`;
--> statement-breakpoint
ALTER TABLE `pembangunan_proyek` ADD CONSTRAINT `pembangunan_proyek_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
ALTER TABLE `survey` ADD CONSTRAINT `survey_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
ALTER TABLE `survey_responden` ADD CONSTRAINT `survey_responden_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
ALTER TABLE `survey_soal` ADD CONSTRAINT `survey_soal_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
ALTER TABLE `pembangunan_dokumentasi` ADD CONSTRAINT `pembangunan_dokumentasi_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `pembangunan_dokumentasi` ADD CONSTRAINT `pembangunan_dokumentasi_proyek_tenant_fk` FOREIGN KEY (`village_id`,`proyek_id`) REFERENCES `pembangunan_proyek`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `survey_jawaban` ADD CONSTRAINT `survey_jawaban_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `survey_jawaban` ADD CONSTRAINT `survey_jawaban_responden_tenant_fk` FOREIGN KEY (`village_id`,`responden_id`) REFERENCES `survey_responden`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `survey_jawaban` ADD CONSTRAINT `survey_jawaban_soal_tenant_fk` FOREIGN KEY (`village_id`,`soal_id`) REFERENCES `survey_soal`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `survey_responden` ADD CONSTRAINT `survey_responden_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `survey_responden` ADD CONSTRAINT `survey_responden_survey_tenant_fk` FOREIGN KEY (`village_id`,`survey_id`) REFERENCES `survey`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `survey_soal` ADD CONSTRAINT `survey_soal_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `survey_soal` ADD CONSTRAINT `survey_soal_survey_tenant_fk` FOREIGN KEY (`village_id`,`survey_id`) REFERENCES `survey`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `pembangunan_dokumentasi_village_proyek_idx` ON `pembangunan_dokumentasi` (`village_id`,`proyek_id`);
--> statement-breakpoint
CREATE INDEX `survey_jawaban_village_responden_idx` ON `survey_jawaban` (`village_id`,`responden_id`);
--> statement-breakpoint
CREATE INDEX `survey_jawaban_village_soal_idx` ON `survey_jawaban` (`village_id`,`soal_id`);
--> statement-breakpoint
CREATE INDEX `survey_responden_village_survey_idx` ON `survey_responden` (`village_id`,`survey_id`);
--> statement-breakpoint
CREATE INDEX `survey_soal_village_survey_idx` ON `survey_soal` (`village_id`,`survey_id`);
