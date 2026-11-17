-- AUD-034 Batch B1: composite tenant FK untuk delapan relasi `ON DELETE SET
-- NULL` yang sebelumnya hanya dijaga application layer.
--
-- Parent (`residents`, `families`, `letters`) sudah memiliki `UNIQUE
-- (village_id, id)` sejak 0001, sehingga batch ini tidak menambah unique key.
-- Kolom child nullable, sedangkan `village_id` child NOT NULL: composite
-- `SET NULL` akan ikut mengosongkan `village_id`, jadi FK baru memakai
-- `RESTRICT` dan repository yang melepas referensi dalam transaksi sebelum
-- parent dihapus. Perilaku bisnis `SET NULL` untuk jalur aplikasi tidak
-- berubah.
--
-- `users.resident_id` ikut dijadikan composite FK. Akun platform memiliki
-- `village_id NULL`; MySQL melewati pemeriksaan FK bila salah satu kolom FK
-- NULL, sehingga akun platform tidak terikat aturan ini.
--
-- Preflight bersifat read-only terhadap data domain: ia hanya membaca tabel
-- child/parent lalu menulis temuan ke `_b1_tenant_preflight_findings`. Bila ada
-- orphan atau referensi lintas desa, statement pemicu gagal (duplicate key)
-- sehingga migration berhenti sebelum satu pun constraint diubah. Tidak ada
-- backfill, update, atau delete data domain.
DROP TABLE IF EXISTS `_b1_tenant_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b1_tenant_preflight_findings`;
--> statement-breakpoint
CREATE TABLE `_b1_tenant_preflight_findings` (
  `relasi` varchar(100) NOT NULL,
  `jenis` varchar(16) NOT NULL,
  `jumlah` bigint NOT NULL,
  `kode_pesan` varchar(48) NOT NULL,
  PRIMARY KEY (`relasi`, `jenis`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b1_tenant_preflight_findings` (`relasi`, `jenis`, `jumlah`, `kode_pesan`)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'kontak.resident_id' AS relasi, 'orphan' AS jenis, COUNT(*) AS jumlah, 'kontak.resident' AS kode_pesan
  FROM `kontak` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.resident_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'kontak.resident_id', 'cross-tenant', COUNT(*), 'kontak.resident'
  FROM `kontak` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'lapak.resident_id', 'orphan', COUNT(*), 'lapak.resident'
  FROM `lapak` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.resident_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'lapak.resident_id', 'cross-tenant', COUNT(*), 'lapak.resident'
  FROM `lapak` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'notifikasi_terkirim.resident_id', 'orphan', COUNT(*), 'notifikasi.resident'
  FROM `notifikasi_terkirim` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.resident_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'notifikasi_terkirim.resident_id', 'cross-tenant', COUNT(*), 'notifikasi.resident'
  FROM `notifikasi_terkirim` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'pendapat.resident_id', 'orphan', COUNT(*), 'pendapat.resident'
  FROM `pendapat` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.resident_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'pendapat.resident_id', 'cross-tenant', COUNT(*), 'pendapat.resident'
  FROM `pendapat` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'family_member_logs.family_id', 'orphan', COUNT(*), 'log.family'
  FROM `family_member_logs` AS c
  LEFT JOIN `families` AS p ON p.id = c.family_id
  WHERE c.family_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'family_member_logs.family_id', 'cross-tenant', COUNT(*), 'log.family'
  FROM `family_member_logs` AS c
  JOIN `families` AS p ON p.id = c.family_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'family_member_logs.resident_id', 'orphan', COUNT(*), 'log.resident'
  FROM `family_member_logs` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.resident_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'family_member_logs.resident_id', 'cross-tenant', COUNT(*), 'log.resident'
  FROM `family_member_logs` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'users.resident_id', 'orphan', COUNT(*), 'users.resident'
  FROM `users` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.resident_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'users.resident_id', 'cross-tenant', COUNT(*), 'users.resident'
  FROM `users` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE c.village_id IS NOT NULL AND p.village_id <> c.village_id
  UNION ALL
  SELECT 'letter_number_archive.letter_id', 'orphan', COUNT(*), 'archive.letter'
  FROM `letter_number_archive` AS c
  LEFT JOIN `letters` AS p ON p.id = c.letter_id
  WHERE c.letter_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'letter_number_archive.letter_id', 'cross-tenant', COUNT(*), 'archive.letter'
  FROM `letter_number_archive` AS c
  JOIN `letters` AS p ON p.id = c.letter_id
  WHERE p.village_id <> c.village_id
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE `_b1_tenant_preflight_abort` (
  `pesan` varchar(64) NOT NULL,
  PRIMARY KEY (`pesan`)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error menghentikan migration sambil mempertahankan temuan.
INSERT INTO `_b1_tenant_preflight_abort` (`pesan`)
SELECT CONCAT('B1 ', kode_pesan, ' ', jenis, '=', jumlah)
FROM `_b1_tenant_preflight_findings`
UNION ALL
SELECT CONCAT('B1 ', kode_pesan, ' ', jenis, '=', jumlah)
FROM `_b1_tenant_preflight_findings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b1_tenant_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b1_tenant_preflight_findings`;
--> statement-breakpoint

ALTER TABLE `users` DROP FOREIGN KEY `users_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `family_member_logs` DROP FOREIGN KEY `family_member_logs_family_id_families_id_fk`;
--> statement-breakpoint
ALTER TABLE `family_member_logs` DROP FOREIGN KEY `family_member_logs_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `pendapat` DROP FOREIGN KEY `pendapat_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `kontak` DROP FOREIGN KEY `kontak_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `letter_number_archive` DROP FOREIGN KEY `letter_number_archive_letter_id_letters_id_fk`;
--> statement-breakpoint
ALTER TABLE `lapak` DROP FOREIGN KEY `lapak_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `notifikasi_terkirim` DROP FOREIGN KEY `notifikasi_terkirim_resident_id_residents_id_fk`;
--> statement-breakpoint
-- Index kolom anak dibuat sebelum composite FK agar InnoDB tidak membuat index
-- implisit dengan nama constraint. `kontak` sudah memiliki index
-- `(village_id, resident_id)` dari baseline.
CREATE INDEX `users_village_resident_idx` ON `users` (`village_id`,`resident_id`);--> statement-breakpoint
CREATE INDEX `family_member_logs_village_family_idx` ON `family_member_logs` (`village_id`,`family_id`);--> statement-breakpoint
CREATE INDEX `family_member_logs_village_resident_idx` ON `family_member_logs` (`village_id`,`resident_id`);--> statement-breakpoint
CREATE INDEX `pendapat_village_resident_idx` ON `pendapat` (`village_id`,`resident_id`);--> statement-breakpoint
CREATE INDEX `letter_number_archive_village_letter_idx` ON `letter_number_archive` (`village_id`,`letter_id`);--> statement-breakpoint
CREATE INDEX `lapak_village_resident_idx` ON `lapak` (`village_id`,`resident_id`);--> statement-breakpoint
CREATE INDEX `notifikasi_village_resident_idx` ON `notifikasi_terkirim` (`village_id`,`resident_id`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_member_logs` ADD CONSTRAINT `family_member_logs_family_tenant_fk` FOREIGN KEY (`village_id`,`family_id`) REFERENCES `families`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_member_logs` ADD CONSTRAINT `family_member_logs_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pendapat` ADD CONSTRAINT `pendapat_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kontak` ADD CONSTRAINT `kontak_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `letter_number_archive` ADD CONSTRAINT `letter_number_archive_letter_tenant_fk` FOREIGN KEY (`village_id`,`letter_id`) REFERENCES `letters`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lapak` ADD CONSTRAINT `lapak_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifikasi_terkirim` ADD CONSTRAINT `notifikasi_terkirim_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
