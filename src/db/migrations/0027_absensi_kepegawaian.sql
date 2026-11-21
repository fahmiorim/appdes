-- Modul Absensi & Kepegawaian: pegawai, riwayat, dokumen, absensi, cuti, dan menu.
ALTER TABLE `kehadiran_perangkat`
  ADD COLUMN `pegawai_id` int NULL AFTER `perangkat_id`,
  ADD COLUMN `latitude_masuk` varchar(30) NULL,
  ADD COLUMN `longitude_masuk` varchar(30) NULL,
  ADD COLUMN `foto_masuk` varchar(255) NULL,
  ADD COLUMN `catatan` varchar(500) NULL,
  ADD INDEX `kehadiran_perangkat_village_tanggal_idx` (`village_id`, `tanggal`),
  ADD INDEX `kehadiran_perangkat_village_status_idx` (`village_id`, `status`);

CREATE TABLE `kepegawaian_pegawai` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `perangkat_id` int NULL,
  `nama` varchar(150) NOT NULL,
  `nip` varchar(30) NULL,
  `nik` varchar(16) NULL,
  `jabatan` varchar(150) NULL,
  `jenis_kelamin` varchar(10) NULL,
  `tempat_lahir` varchar(100) NULL,
  `tanggal_lahir` date NULL,
  `alamat` varchar(500) NULL,
  `telepon` varchar(30) NULL,
  `email` varchar(150) NULL,
  `pendidikan` varchar(100) NULL,
  `status_pegawai` varchar(20) NOT NULL DEFAULT 'tetap',
  `status` varchar(20) NOT NULL DEFAULT 'aktif',
  `tanggal_masuk` date NULL,
  `tanggal_keluar` date NULL,
  `foto` varchar(255) NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `kepegawaian_pegawai_id` PRIMARY KEY(`id`),
  CONSTRAINT `kepegawaian_pegawai_village_id_uq` UNIQUE(`village_id`,`id`),
  CONSTRAINT `kepegawaian_pegawai_village_perangkat_uq` UNIQUE(`village_id`,`perangkat_id`),
  INDEX `kepegawaian_pegawai_village_status_idx` (`village_id`,`status`),
  INDEX `kepegawaian_pegawai_village_jabatan_idx` (`village_id`,`jabatan`)
);
--> statement-breakpoint
CREATE TABLE `kepegawaian_riwayat` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `pegawai_id` int NOT NULL,
  `jabatan` varchar(150) NOT NULL,
  `unit_kerja` varchar(150) NULL,
  `nomor_sk` varchar(100) NULL,
  `mulai` date NOT NULL,
  `selesai` date NULL,
  `keterangan` text NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `kepegawaian_riwayat_id` PRIMARY KEY(`id`),
  CONSTRAINT `kepegawaian_riwayat_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE CASCADE,
  INDEX `kepegawaian_riwayat_village_pegawai_idx` (`village_id`,`pegawai_id`)
);
--> statement-breakpoint
CREATE TABLE `kepegawaian_dokumen` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `pegawai_id` int NOT NULL,
  `judul` varchar(180) NOT NULL,
  `kategori` varchar(50) NOT NULL DEFAULT 'lainnya',
  `nomor` varchar(100) NULL,
  `tanggal` date NULL,
  `berkas` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `kepegawaian_dokumen_id` PRIMARY KEY(`id`),
  CONSTRAINT `kepegawaian_dokumen_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE CASCADE,
  INDEX `kepegawaian_dokumen_village_pegawai_idx` (`village_id`,`pegawai_id`)
);
--> statement-breakpoint
CREATE TABLE `cuti_pegawai` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `pegawai_id` int NOT NULL,
  `jenis` varchar(30) NOT NULL DEFAULT 'cuti_tahunan',
  `mulai` date NOT NULL,
  `selesai` date NOT NULL,
  `durasi` int NOT NULL,
  `alasan` text NOT NULL,
  `lampiran` varchar(255) NULL,
  `status` varchar(20) NOT NULL DEFAULT 'menunggu',
  `catatan` text NULL,
  `diputuskan_oleh` varchar(36) NULL,
  `diputuskan_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `cuti_pegawai_id` PRIMARY KEY(`id`),
  CONSTRAINT `cuti_pegawai_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE CASCADE,
  INDEX `cuti_pegawai_village_status_idx` (`village_id`,`status`),
  INDEX `cuti_pegawai_village_pegawai_idx` (`village_id`,`pegawai_id`),
  INDEX `cuti_pegawai_village_dates_idx` (`village_id`,`mulai`,`selesai`)
);
--> statement-breakpoint
CREATE TABLE `cuti_kuota` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `pegawai_id` int NOT NULL,
  `tahun` int NOT NULL,
  `total` int NOT NULL DEFAULT 12,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `cuti_kuota_id` PRIMARY KEY(`id`),
  CONSTRAINT `cuti_kuota_village_pegawai_tahun_uq` UNIQUE(`village_id`,`pegawai_id`,`tahun`),
  CONSTRAINT `cuti_kuota_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- Backfill aparatur aktif sebagai pegawai tetap tanpa membuat data pegawai ganda.
INSERT INTO `kepegawaian_pegawai` (`village_id`,`perangkat_id`,`nama`,`nip`,`nik`,`jenis_kelamin`,`tempat_lahir`,`tanggal_lahir`,`foto`,`status_pegawai`,`status`,`tanggal_masuk`)
SELECT `village_id`,`id`,`nama`,`nip`,`nik`,`jenis_kelamin`,`tempat_lahir`,`tanggal_lahir`,`foto`,'tetap','aktif',NULL
FROM `perangkat_desa`
WHERE `status` = 'aktif';
--> statement-breakpoint
UPDATE `kehadiran_perangkat` h
INNER JOIN `kepegawaian_pegawai` p
  ON p.`village_id`=h.`village_id` AND p.`perangkat_id`=h.`perangkat_id`
SET h.`pegawai_id`=p.`id`
WHERE h.`pegawai_id` IS NULL AND h.`perangkat_id` IS NOT NULL;
--> statement-breakpoint

-- Menu grup + tiga halaman modul; tidak menimpa menu tenant yang telah ada.
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'absensi-kepegawaian','Absensi & Kepegawaian',NULL,'▦',1,0,1,8,0
FROM `villages` v
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='absensi-kepegawaian');
--> statement-breakpoint
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`, child.`slug`, child.`name`, child.`url`, child.`icon`, 0,0,1,child.`sort_order`,
  COALESCE((SELECT p.`id` FROM `modules` p WHERE p.`village_id`=v.`id` AND p.`slug`='absensi-kepegawaian' LIMIT 1),0)
FROM `villages` v
CROSS JOIN (
  SELECT 'absensi-dashboard' AS `slug`,'Dashboard' AS `name`,'/absensi-kepegawaian' AS `url`,'▥' AS `icon`,1 AS `sort_order`
  UNION ALL SELECT 'kehadiran','Absensi','/absensi-kepegawaian/absensi','◷',2
  UNION ALL SELECT 'kepegawaian','Data Pegawai','/absensi-kepegawaian/pegawai','♙',3
  UNION ALL SELECT 'cuti-izin','Cuti & Izin','/absensi-kepegawaian/cuti-izin','▣',4
) child
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`=child.`slug`);
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'manage'
FROM `roles` r INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator' AND m.`slug` IN ('absensi-kepegawaian','absensi-dashboard','kehadiran','kepegawaian','cuti-izin')
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'read'
FROM `roles` r INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug` IN ('sekretaris','operator','kepala-desa') AND m.`slug` IN ('absensi-kepegawaian','absensi-dashboard','kehadiran','kepegawaian','cuti-izin')
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
