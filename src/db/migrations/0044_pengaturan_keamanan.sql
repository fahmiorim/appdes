CREATE TABLE `pengaturan_keamanan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `konfigurasi` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pengaturan_keamanan_id` PRIMARY KEY(`id`),
  CONSTRAINT `pengaturan_keamanan_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pengaturan_keamanan_village_uq` UNIQUE(`village_id`)
);
--> statement-breakpoint
CREATE TABLE `ip_diblokir` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `alamat_ip` varchar(45) NOT NULL,
  `alasan` varchar(255) NOT NULL DEFAULT 'Diblokir administrator',
  `blocked_by` varchar(36),
  `blocked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `ip_diblokir_id` PRIMARY KEY(`id`),
  CONSTRAINT `ip_diblokir_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE,
  CONSTRAINT `ip_diblokir_village_ip_uq` UNIQUE(`village_id`,`alamat_ip`)
);
