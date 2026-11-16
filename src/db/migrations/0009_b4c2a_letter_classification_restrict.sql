-- AUD-034 Batch 4C-2a: tenant composite FKs for the four `SET NULL` relations
-- that point at `letter_classifications` (incoming_letters, letter_dinas,
-- letter_types, outgoing_letters).
-- No domain rows are changed. Preflight aborts before constraints change if
-- orphan/cross-tenant references exist. Helper tables are kept for diagnosis
-- when the migration aborts, and dropped when it succeeds.
--
-- Composite SET NULL tidak dapat dipakai karena `village_id` anak NOT NULL,
-- sehingga FK baru memakai ON DELETE RESTRICT. Perilaku hapus klasifikasi
-- berubah: penghapusan langsung/DBA ditolak selama masih dirujuk. Aplikasi
-- melepas referensi keempat tabel dalam satu transaksi lebih dulu
-- (`deleteKlasifikasi` di src/features/surat/infrastructure/master-repository.ts),
-- sehingga perilaku bisnis "klasifikasi dihapus, referensi menjadi NULL" tetap
-- sama untuk jalur aplikasi.

DROP TABLE IF EXISTS _b4c2a_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c2a_tenant_preflight_findings;
--> statement-breakpoint
CREATE TABLE _b4c2a_tenant_preflight_findings (
  relasi varchar(100) NOT NULL,
  jenis varchar(16) NOT NULL,
  jumlah bigint NOT NULL,
  kode_pesan varchar(48) NOT NULL,
  PRIMARY KEY (relasi, jenis)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO _b4c2a_tenant_preflight_findings (relasi, jenis, jumlah, kode_pesan)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'incoming_letters.classification_id' relasi, 'orphan' jenis, COUNT(*) jumlah, 'incoming.cls' kode_pesan
  FROM incoming_letters c LEFT JOIN letter_classifications p ON p.id = c.classification_id WHERE c.classification_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'incoming_letters.classification_id', 'cross-tenant', COUNT(*), 'incoming.cls'
  FROM incoming_letters c JOIN letter_classifications p ON p.id = c.classification_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'letter_dinas.classification_id', 'orphan', COUNT(*), 'dinas.cls'
  FROM letter_dinas c LEFT JOIN letter_classifications p ON p.id = c.classification_id WHERE c.classification_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'letter_dinas.classification_id', 'cross-tenant', COUNT(*), 'dinas.cls'
  FROM letter_dinas c JOIN letter_classifications p ON p.id = c.classification_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'letter_types.classification_id', 'orphan', COUNT(*), 'jenis.cls'
  FROM letter_types c LEFT JOIN letter_classifications p ON p.id = c.classification_id WHERE c.classification_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'letter_types.classification_id', 'cross-tenant', COUNT(*), 'jenis.cls'
  FROM letter_types c JOIN letter_classifications p ON p.id = c.classification_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'outgoing_letters.classification_id', 'orphan', COUNT(*), 'outgoing.cls'
  FROM outgoing_letters c LEFT JOIN letter_classifications p ON p.id = c.classification_id WHERE c.classification_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'outgoing_letters.classification_id', 'cross-tenant', COUNT(*), 'outgoing.cls'
  FROM outgoing_letters c JOIN letter_classifications p ON p.id = c.classification_id WHERE p.village_id <> c.village_id
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE _b4c2a_tenant_preflight_abort (
  pesan varchar(64) NOT NULL,
  PRIMARY KEY (pesan)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error stops migration while preserving full findings above.
INSERT INTO _b4c2a_tenant_preflight_abort (pesan)
SELECT CONCAT('B4C2A ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4c2a_tenant_preflight_findings
UNION ALL
SELECT CONCAT('B4C2A ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4c2a_tenant_preflight_findings;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c2a_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c2a_tenant_preflight_findings;
--> statement-breakpoint

ALTER TABLE `incoming_letters` DROP FOREIGN KEY `incoming_letters_classification_id_letter_classifications_id_fk`;
--> statement-breakpoint
ALTER TABLE `letter_dinas` DROP FOREIGN KEY `letter_dinas_classification_id_letter_classifications_id_fk`;
--> statement-breakpoint
ALTER TABLE `letter_types` DROP FOREIGN KEY `letter_types_classification_id_letter_classifications_id_fk`;
--> statement-breakpoint
ALTER TABLE `outgoing_letters` DROP FOREIGN KEY `outgoing_letters_classification_id_letter_classifications_id_fk`;
--> statement-breakpoint
ALTER TABLE `letter_classifications` ADD CONSTRAINT `letter_classifications_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
CREATE INDEX `incoming_letters_village_classification_idx` ON `incoming_letters` (`village_id`,`classification_id`);--> statement-breakpoint
CREATE INDEX `letter_dinas_village_classification_idx` ON `letter_dinas` (`village_id`,`classification_id`);--> statement-breakpoint
CREATE INDEX `letter_types_village_classification_idx` ON `letter_types` (`village_id`,`classification_id`);--> statement-breakpoint
CREATE INDEX `outgoing_letters_village_classification_idx` ON `outgoing_letters` (`village_id`,`classification_id`);--> statement-breakpoint
ALTER TABLE `incoming_letters` ADD CONSTRAINT `incoming_letters_classification_tenant_fk` FOREIGN KEY (`village_id`,`classification_id`) REFERENCES `letter_classifications`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `letter_dinas` ADD CONSTRAINT `letter_dinas_classification_tenant_fk` FOREIGN KEY (`village_id`,`classification_id`) REFERENCES `letter_classifications`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `letter_types` ADD CONSTRAINT `letter_types_classification_tenant_fk` FOREIGN KEY (`village_id`,`classification_id`) REFERENCES `letter_classifications`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outgoing_letters` ADD CONSTRAINT `outgoing_letters_classification_tenant_fk` FOREIGN KEY (`village_id`,`classification_id`) REFERENCES `letter_classifications`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
