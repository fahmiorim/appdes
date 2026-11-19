CREATE TABLE `potensi_desa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `kategori` varchar(40) NOT NULL,
  `judul` varchar(160) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `ringkasan` varchar(500) NULL,
  `deskripsi` text NULL,
  `gambar` varchar(255) NULL,
  `lokasi` varchar(200) NULL,
  `kontak` varchar(150) NULL,
  `unggulan` boolean NOT NULL DEFAULT false,
  `aktif` boolean NOT NULL DEFAULT false,
  `urut` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `potensi_desa_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `potensi_desa_village_slug_uq` (`village_id`, `slug`),
  UNIQUE KEY `potensi_desa_village_id_uq` (`village_id`, `id`),
  KEY `potensi_desa_village_category_active_idx` (`village_id`, `kategori`, `aktif`, `urut`)
);
--> statement-breakpoint
CREATE TABLE `potensi_indikator` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `potensi_id` int NOT NULL,
  `label` varchar(100) NOT NULL,
  `nilai` varchar(100) NOT NULL,
  `urut` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `potensi_indikator_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE,
  CONSTRAINT `potensi_indikator_tenant_fk` FOREIGN KEY (`village_id`, `potensi_id`) REFERENCES `potensi_desa`(`village_id`, `id`) ON DELETE CASCADE,
  KEY `potensi_indikator_village_potensi_idx` (`village_id`, `potensi_id`, `urut`)
);