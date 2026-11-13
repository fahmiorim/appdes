-- AUD-034 B4 — composite tenant FK untuk bumindes_item.buku_id.
-- Preflight menghentikan migration sebelum perubahan constraint bila ada data
-- orphan atau lintas desa. Tidak ada data domain yang diubah otomatis.
DROP TABLE IF EXISTS `_b4_bumindes_preflight_findings`;
--> statement-breakpoint
CREATE TABLE `_b4_bumindes_preflight_findings` (
  `relasi` varchar(64) NOT NULL,
  `jenis` varchar(16) NOT NULL,
  `jumlah` bigint NOT NULL,
  PRIMARY KEY (`relasi`, `jenis`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b4_bumindes_preflight_findings` (`relasi`, `jenis`, `jumlah`)
SELECT t.relasi, t.jenis, t.jumlah
FROM (
  SELECT 'bumindes_item.buku_id' AS relasi, 'orphan' AS jenis, COUNT(*) AS jumlah
  FROM `bumindes_item` AS c
  LEFT JOIN `bumindes_buku` AS p ON p.id = c.buku_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'bumindes_item.buku_id', 'cross-tenant', COUNT(*)
  FROM `bumindes_item` AS c
  JOIN `bumindes_buku` AS p ON p.id = c.buku_id
  WHERE p.village_id <> c.village_id
) AS temuan
WHERE temuan.jumlah > 0;
--> statement-breakpoint
-- Memaksa ER_DUP_ENTRY dengan pesan relasi/jenis/jumlah bila preflight menemukan
-- data; tanpa temuan INSERT menyisipkan nol baris dan migration lanjut.
DROP TABLE IF EXISTS `_b4_bumindes_preflight_abort`;
--> statement-breakpoint
CREATE TABLE `_b4_bumindes_preflight_abort` (
  `pesan` varchar(255) NOT NULL,
  PRIMARY KEY (`pesan`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b4_bumindes_preflight_abort` (`pesan`)
SELECT CONCAT('B4 BUMDes: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b4_bumindes_preflight_findings`
UNION ALL
SELECT CONCAT('B4 BUMDes: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b4_bumindes_preflight_findings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b4_bumindes_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b4_bumindes_preflight_findings`;
--> statement-breakpoint
ALTER TABLE `bumindes_item` DROP FOREIGN KEY `bumindes_item_buku_id_bumindes_buku_id_fk`;
--> statement-breakpoint
ALTER TABLE `bumindes_buku` ADD CONSTRAINT `bumindes_buku_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
CREATE INDEX `bumindes_item_village_buku_idx` ON `bumindes_item` (`village_id`,`buku_id`);
--> statement-breakpoint
ALTER TABLE `bumindes_item` ADD CONSTRAINT `bumindes_item_buku_tenant_fk` FOREIGN KEY (`village_id`,`buku_id`) REFERENCES `bumindes_buku`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;