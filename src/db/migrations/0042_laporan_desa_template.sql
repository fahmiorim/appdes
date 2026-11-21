CREATE TABLE IF NOT EXISTS `laporan_desa_template` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `judul` varchar(150) NOT NULL,
  `jenis` varchar(30) NOT NULL,
  `deskripsi` text,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `laporan_desa_template_village_created_idx` (`village_id`, `created_at`),
  KEY `laporan_desa_template_village_type_idx` (`village_id`, `jenis`),
  CONSTRAINT `laporan_desa_template_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `laporan_desa_template_user_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
