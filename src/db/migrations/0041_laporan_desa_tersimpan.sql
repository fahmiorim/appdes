CREATE TABLE IF NOT EXISTS `laporan_desa_tersimpan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `judul` varchar(200) NOT NULL,
  `jenis` varchar(30) NOT NULL,
  `tahun` int NOT NULL,
  `deskripsi` text,
  `kolom` json NOT NULL,
  `baris` json NOT NULL,
  `dibuat_oleh` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `laporan_desa_tersimpan_village_created_idx` (`village_id`, `created_at`),
  KEY `laporan_desa_tersimpan_village_type_year_idx` (`village_id`, `jenis`, `tahun`),
  CONSTRAINT `laporan_desa_tersimpan_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `laporan_desa_tersimpan_user_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
