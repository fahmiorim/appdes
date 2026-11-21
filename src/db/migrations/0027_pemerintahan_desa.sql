-- Modul Pemerintahan Desa: perluasan profil perangkat dan kelembagaan tenant.
ALTER TABLE `perangkat_desa`
  ADD COLUMN `pendidikan` varchar(100) NULL,
  ADD COLUMN `telepon` varchar(30) NULL,
  ADD COLUMN `email` varchar(150) NULL,
  ADD COLUMN `alamat` varchar(255) NULL,
  ADD COLUMN `nomor_sk_pengangkatan` varchar(100) NULL,
  ADD COLUMN `tanggal_pengangkatan` date NULL,
  ADD COLUMN `nomor_sk_pemberhentian` varchar(100) NULL,
  ADD COLUMN `tanggal_pemberhentian` date NULL,
  ADD COLUMN `atasan_id` int NULL,
  ADD UNIQUE KEY `perangkat_desa_village_id_uq` (`village_id`, `id`),
  ADD KEY `perangkat_desa_village_atasan_idx` (`village_id`, `atasan_id`);
--> statement-breakpoint

CREATE TABLE `lembaga_desa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `nama` varchar(150) NOT NULL,
  `jenis` varchar(50) NOT NULL DEFAULT 'lainnya',
  `deskripsi` text NULL,
  `tugas_fungsi` text NULL,
  `dasar_hukum` varchar(255) NULL,
  `masa_bakti_mulai` date NULL,
  `masa_bakti_selesai` date NULL,
  `status` varchar(20) NOT NULL DEFAULT 'aktif',
  `tampil_publik` boolean NOT NULL DEFAULT false,
  `urut` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lembaga_desa_village_id_uq` (`village_id`, `id`),
  KEY `lembaga_desa_village_status_idx` (`village_id`, `status`),
  CONSTRAINT `lembaga_desa_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE `lembaga_anggota` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `lembaga_id` int NOT NULL,
  `nama` varchar(150) NOT NULL,
  `jabatan` varchar(100) NULL,
  `foto` varchar(255) NULL,
  `periode_mulai` date NULL,
  `periode_selesai` date NULL,
  `aktif` boolean NOT NULL DEFAULT true,
  `tampil_publik` boolean NOT NULL DEFAULT false,
  `urut` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lembaga_anggota_village_lembaga_idx` (`village_id`, `lembaga_id`),
  CONSTRAINT `lembaga_anggota_tenant_fk` FOREIGN KEY (`village_id`, `lembaga_id`) REFERENCES `lembaga_desa`(`village_id`, `id`) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE `perangkat_riwayat_jabatan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `perangkat_id` int NOT NULL,
  `jabatan` varchar(150) NOT NULL,
  `nomor_sk` varchar(100) NULL,
  `mulai` date NULL,
  `selesai` date NULL,
  `keterangan` text NULL,
  `tampil_publik` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `perangkat_riwayat_village_perangkat_idx` (`village_id`, `perangkat_id`),
  CONSTRAINT `perangkat_riwayat_tenant_fk` FOREIGN KEY (`village_id`, `perangkat_id`) REFERENCES `perangkat_desa`(`village_id`, `id`) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE `pemerintahan_dokumen` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `perangkat_id` int NULL,
  `lembaga_id` int NULL,
  `judul` varchar(180) NOT NULL,
  `nomor` varchar(100) NULL,
  `tanggal` date NULL,
  `berkas` varchar(255) NOT NULL,
  `tampil_publik` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pemerintahan_dokumen_village_idx` (`village_id`),
  CONSTRAINT `pemerintahan_dokumen_perangkat_tenant_fk` FOREIGN KEY (`village_id`, `perangkat_id`) REFERENCES `perangkat_desa`(`village_id`, `id`) ON DELETE CASCADE,
  CONSTRAINT `pemerintahan_dokumen_lembaga_tenant_fk` FOREIGN KEY (`village_id`, `lembaga_id`) REFERENCES `lembaga_desa`(`village_id`, `id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- Grup dan halaman administrasi Pemerintahan Desa untuk seluruh tenant yang sudah ada.
INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, 'pemerintahan-desa', 'Pemerintahan Desa', NULL, '⌂', 1, 0, 1, 6, 0
FROM `villages` v
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='pemerintahan-desa');
--> statement-breakpoint

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, child.`slug`, child.`name`, child.`url`, child.`icon`, 0, 0, 1, child.`sort_order`,
  (SELECT p.`id` FROM `modules` p WHERE p.`village_id`=v.`id` AND p.`slug`='pemerintahan-desa' LIMIT 1)
FROM `villages` v
CROSS JOIN (
  SELECT 'pemerintahan-dashboard' AS `slug`, 'Dashboard Pemerintahan' AS `name`, '/pemerintahan-desa' AS `url`, '▦' AS `icon`, 1 AS `sort_order`
  UNION ALL SELECT 'perangkat-desa', 'Perangkat Desa', '/pemerintahan-desa/perangkat', '♙', 2
  UNION ALL SELECT 'lembaga-desa', 'Lembaga Desa & BPD', '/pemerintahan-desa/lembaga', '♧', 3
  UNION ALL SELECT 'wilayah', 'Wilayah & Organisasi', '/pemerintahan-desa/wilayah', '⌖', 4
) child
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`=child.`slug`);
--> statement-breakpoint

-- Pastikan modul lama dipindahkan ke grup Pemerintahan Desa.
UPDATE `modules` child
INNER JOIN `modules` parent ON parent.`village_id`=child.`village_id` AND parent.`slug`='pemerintahan-desa'
SET child.`parent_id`=parent.`id`, child.`is_group`=0, child.`is_hidden`=0, child.`is_active`=1,
    child.`url`=CASE child.`slug`
      WHEN 'pemerintahan-dashboard' THEN '/pemerintahan-desa'
      WHEN 'perangkat-desa' THEN '/pemerintahan-desa/perangkat'
      WHEN 'lembaga-desa' THEN '/pemerintahan-desa/lembaga'
      WHEN 'wilayah' THEN '/pemerintahan-desa/wilayah'
    END,
    child.`name`=CASE child.`slug`
      WHEN 'pemerintahan-dashboard' THEN 'Dashboard Pemerintahan'
      WHEN 'perangkat-desa' THEN 'Perangkat Desa'
      WHEN 'lembaga-desa' THEN 'Lembaga & BPD'
      WHEN 'wilayah' THEN 'Wilayah & Organisasi'
    END
WHERE child.`slug` IN ('pemerintahan-dashboard','perangkat-desa','lembaga-desa','wilayah');
--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator'
  AND m.`slug` IN ('pemerintahan-desa','pemerintahan-dashboard','perangkat-desa','lembaga-desa','wilayah')
  ON DUPLICATE KEY UPDATE `access`=VALUES(`access`);
