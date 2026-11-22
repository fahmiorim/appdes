CREATE TABLE IF NOT EXISTS `registrasi_warga` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `nik` varchar(16) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `no_hp` varchar(20) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'menunggu',
  `catatan` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `registrasi_warga_tenant_status_idx` (`village_id`,`status`,`created_at`),
  KEY `registrasi_warga_tenant_nik_idx` (`village_id`,`nik`),
  CONSTRAINT `registrasi_warga_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
