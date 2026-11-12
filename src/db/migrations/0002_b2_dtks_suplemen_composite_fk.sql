-- B2 — Composite tenant FK untuk DTKS & Suplemen.
--
-- Migration ini mengubah sembilan FK single-column menjadi composite
-- (`village_id`, `<parent>_id`) agar isolasi tenant ditegakkan database.
--
-- Preflight di bawah WAJIB berjalan lebih dulu dan bersifat read-only terhadap
-- data domain: ia hanya membaca tabel domain, lalu menulis temuan ke tabel
-- bantu `_b2_preflight_findings`. Jika ada orphan atau referensi lintas desa,
-- statement pemicu gagal dengan pesan berisi nama relasi dan jumlah baris,
-- sehingga migration berhenti sebelum satu pun constraint diubah. Tabel temuan
-- sengaja ditinggalkan agar operator dapat memeriksa detailnya, dan dihapus
-- ulang pada percobaan berikutnya.
--
-- Tidak ada data legacy yang dihapus/dipindahkan otomatis. Perbaikan data harus
-- lewat keputusan operator (lihat AUD/B2 runbook).
DROP TABLE IF EXISTS `_b2_preflight_findings`;
--> statement-breakpoint
CREATE TABLE `_b2_preflight_findings` (
  `relasi` varchar(64) NOT NULL,
  `jenis` varchar(16) NOT NULL,
  `jumlah` bigint NOT NULL,
  PRIMARY KEY (`relasi`, `jenis`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b2_preflight_findings` (`relasi`, `jenis`, `jumlah`)
SELECT t.relasi, t.jenis, t.jumlah
FROM (
  SELECT 'dtks.rtm_id' AS relasi, 'orphan' AS jenis, COUNT(*) AS jumlah
  FROM `dtks` AS c
  LEFT JOIN `rtm` AS p ON p.id = c.rtm_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'dtks.rtm_id', 'cross-tenant', COUNT(*)
  FROM `dtks` AS c
  JOIN `rtm` AS p ON p.id = c.rtm_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'dtks.keluarga_id', 'orphan', COUNT(*)
  FROM `dtks` AS c
  LEFT JOIN `families` AS p ON p.id = c.keluarga_id
  WHERE c.keluarga_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'dtks.keluarga_id', 'cross-tenant', COUNT(*)
  FROM `dtks` AS c
  JOIN `families` AS p ON p.id = c.keluarga_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'dtks_anggota.dtks_id', 'orphan', COUNT(*)
  FROM `dtks_anggota` AS c
  LEFT JOIN `dtks` AS p ON p.id = c.dtks_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'dtks_anggota.dtks_id', 'cross-tenant', COUNT(*)
  FROM `dtks_anggota` AS c
  JOIN `dtks` AS p ON p.id = c.dtks_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'dtks_anggota.penduduk_id', 'orphan', COUNT(*)
  FROM `dtks_anggota` AS c
  LEFT JOIN `residents` AS p ON p.id = c.penduduk_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'dtks_anggota.penduduk_id', 'cross-tenant', COUNT(*)
  FROM `dtks_anggota` AS c
  JOIN `residents` AS p ON p.id = c.penduduk_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  -- Junction belum punya village_id, jadi desa child diambil dari DTKS-nya:
  -- di sini cukup dideteksi FK dtks yang hilang. Ketidakcocokan desa DTKS vs
  -- lampiran dideteksi pada cabang lampiran_id di bawah.
  SELECT 'dtks_ref_lampiran.dtks_id', 'orphan', COUNT(*)
  FROM `dtks_ref_lampiran` AS c
  LEFT JOIN `dtks` AS p ON p.id = c.dtks_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'dtks_ref_lampiran.lampiran_id', 'orphan', COUNT(*)
  FROM `dtks_ref_lampiran` AS c
  LEFT JOIN `dtks_lampiran` AS p ON p.id = c.lampiran_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'dtks_ref_lampiran.lampiran_id', 'cross-tenant', COUNT(*)
  FROM `dtks_ref_lampiran` AS c
  JOIN `dtks_lampiran` AS p ON p.id = c.lampiran_id
  JOIN `dtks` AS d ON d.id = c.dtks_id
  WHERE p.village_id <> d.village_id
  UNION ALL
  SELECT 'suplemen_terdata.suplemen_id', 'orphan', COUNT(*)
  FROM `suplemen_terdata` AS c
  LEFT JOIN `suplemen` AS p ON p.id = c.id_suplemen
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'suplemen_terdata.suplemen_id', 'cross-tenant', COUNT(*)
  FROM `suplemen_terdata` AS c
  JOIN `suplemen` AS p ON p.id = c.id_suplemen
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'suplemen_terdata.penduduk_id', 'orphan', COUNT(*)
  FROM `suplemen_terdata` AS c
  LEFT JOIN `residents` AS p ON p.id = c.penduduk_id
  WHERE c.penduduk_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'suplemen_terdata.penduduk_id', 'cross-tenant', COUNT(*)
  FROM `suplemen_terdata` AS c
  JOIN `residents` AS p ON p.id = c.penduduk_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'suplemen_terdata.keluarga_id', 'orphan', COUNT(*)
  FROM `suplemen_terdata` AS c
  LEFT JOIN `families` AS p ON p.id = c.keluarga_id
  WHERE c.keluarga_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'suplemen_terdata.keluarga_id', 'cross-tenant', COUNT(*)
  FROM `suplemen_terdata` AS c
  JOIN `families` AS p ON p.id = c.keluarga_id
  WHERE p.village_id <> c.village_id
) AS t
WHERE t.jumlah > 0;
--> statement-breakpoint
-- Pemicu gagal-closed: baris temuan disisipkan dua kali ke kolom PRIMARY KEY,
-- sehingga MySQL mengembalikan ER_DUP_ENTRY dengan pesan yang menyebut relasi,
-- jenis masalah, dan jumlah baris. Tanpa temuan, statement ini menyisipkan nol
-- baris dan migration lanjut. Tidak butuh CREATE ROUTINE/TRIGGER.
DROP TABLE IF EXISTS `_b2_preflight_abort`;
--> statement-breakpoint
CREATE TABLE `_b2_preflight_abort` (
  `pesan` varchar(255) NOT NULL,
  PRIMARY KEY (`pesan`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b2_preflight_abort` (`pesan`)
SELECT CONCAT('B2 preflight gagal: ', relasi, ' ', jenis, ' = ', jumlah, ' baris') FROM `_b2_preflight_findings`
UNION ALL
SELECT CONCAT('B2 preflight gagal: ', relasi, ' ', jenis, ' = ', jumlah, ' baris') FROM `_b2_preflight_findings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b2_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b2_preflight_findings`;
--> statement-breakpoint
ALTER TABLE `dtks` DROP FOREIGN KEY `dtks_rtm_id_rtm_id_fk`;
--> statement-breakpoint
ALTER TABLE `dtks` DROP FOREIGN KEY `dtks_keluarga_id_families_id_fk`;
--> statement-breakpoint
ALTER TABLE `dtks_anggota` DROP FOREIGN KEY `dtks_anggota_dtks_id_dtks_id_fk`;
--> statement-breakpoint
ALTER TABLE `dtks_anggota` DROP FOREIGN KEY `dtks_anggota_penduduk_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `dtks_ref_lampiran` DROP FOREIGN KEY `dtks_ref_lampiran_dtks_id_dtks_id_fk`;
--> statement-breakpoint
ALTER TABLE `dtks_ref_lampiran` DROP FOREIGN KEY `dtks_ref_lampiran_lampiran_id_dtks_lampiran_id_fk`;
--> statement-breakpoint
ALTER TABLE `suplemen_terdata` DROP FOREIGN KEY `suplemen_terdata_id_suplemen_suplemen_id_fk`;
--> statement-breakpoint
ALTER TABLE `suplemen_terdata` DROP FOREIGN KEY `suplemen_terdata_penduduk_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `suplemen_terdata` DROP FOREIGN KEY `suplemen_terdata_keluarga_id_families_id_fk`;
--> statement-breakpoint
-- Backfill dua langkah (nullable -> isi dari parent -> NOT NULL). Setiap baris
-- junction mewarisi desa DTKS-nya; guard di atas memastikan tidak ada junction
-- yang DTKS-nya hilang atau berbeda desa dengan lampirannya.
ALTER TABLE `dtks_ref_lampiran` ADD `village_id` int NULL;
--> statement-breakpoint
UPDATE `dtks_ref_lampiran` AS r
JOIN `dtks` AS d ON d.id = r.dtks_id
SET r.village_id = d.village_id
WHERE r.village_id IS NULL;
--> statement-breakpoint
ALTER TABLE `dtks_ref_lampiran` MODIFY COLUMN `village_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `dtks` ADD CONSTRAINT `dtks_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
ALTER TABLE `dtks_lampiran` ADD CONSTRAINT `dtks_lampiran_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
ALTER TABLE `suplemen` ADD CONSTRAINT `suplemen_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
-- Index kolom anak dibuat sebelum FK agar InnoDB tidak membuat index otomatis
-- dengan nama constraint (yang akan terduplikasi dengan index di bawah).
CREATE INDEX `dtks_village_keluarga_idx` ON `dtks` (`village_id`,`keluarga_id`);
--> statement-breakpoint
CREATE INDEX `dtks_anggota_village_dtks_idx` ON `dtks_anggota` (`village_id`,`dtks_id`);
--> statement-breakpoint
CREATE INDEX `dtks_anggota_village_penduduk_idx` ON `dtks_anggota` (`village_id`,`penduduk_id`);
--> statement-breakpoint
CREATE INDEX `dtks_ref_lampiran_village_dtks_idx` ON `dtks_ref_lampiran` (`village_id`,`dtks_id`);
--> statement-breakpoint
CREATE INDEX `dtks_ref_lampiran_village_lampiran_idx` ON `dtks_ref_lampiran` (`village_id`,`lampiran_id`);
--> statement-breakpoint
CREATE INDEX `suplemen_terdata_village_suplemen_idx` ON `suplemen_terdata` (`village_id`,`id_suplemen`);
--> statement-breakpoint
CREATE INDEX `suplemen_terdata_village_penduduk_idx` ON `suplemen_terdata` (`village_id`,`penduduk_id`);
--> statement-breakpoint
CREATE INDEX `suplemen_terdata_village_keluarga_idx` ON `suplemen_terdata` (`village_id`,`keluarga_id`);
--> statement-breakpoint
ALTER TABLE `dtks` ADD CONSTRAINT `dtks_rtm_tenant_fk` FOREIGN KEY (`village_id`,`rtm_id`) REFERENCES `rtm`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `dtks` ADD CONSTRAINT `dtks_keluarga_tenant_fk` FOREIGN KEY (`village_id`,`keluarga_id`) REFERENCES `families`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `dtks_anggota` ADD CONSTRAINT `dtks_anggota_dtks_tenant_fk` FOREIGN KEY (`village_id`,`dtks_id`) REFERENCES `dtks`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `dtks_anggota` ADD CONSTRAINT `dtks_anggota_penduduk_tenant_fk` FOREIGN KEY (`village_id`,`penduduk_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `dtks_ref_lampiran` ADD CONSTRAINT `dtks_ref_lampiran_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `dtks_ref_lampiran` ADD CONSTRAINT `dtks_ref_lampiran_dtks_tenant_fk` FOREIGN KEY (`village_id`,`dtks_id`) REFERENCES `dtks`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `dtks_ref_lampiran` ADD CONSTRAINT `dtks_ref_lampiran_lampiran_tenant_fk` FOREIGN KEY (`village_id`,`lampiran_id`) REFERENCES `dtks_lampiran`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `suplemen_terdata` ADD CONSTRAINT `suplemen_terdata_suplemen_tenant_fk` FOREIGN KEY (`village_id`,`id_suplemen`) REFERENCES `suplemen`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `suplemen_terdata` ADD CONSTRAINT `suplemen_terdata_penduduk_tenant_fk` FOREIGN KEY (`village_id`,`penduduk_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `suplemen_terdata` ADD CONSTRAINT `suplemen_terdata_keluarga_tenant_fk` FOREIGN KEY (`village_id`,`keluarga_id`) REFERENCES `families`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
