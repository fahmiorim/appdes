ALTER TABLE `inventaris_pemeliharaan`
  ADD COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `deleted_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `inventaris_pemeliharaan` ADD UNIQUE KEY `inventaris_pemeliharaan_village_id_uq` (`village_id`,`id`);
--> statement-breakpoint
CREATE TABLE `inventaris_pemeliharaan_riwayat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `pemeliharaan_id` int NOT NULL,
  `inventaris_id` int NOT NULL,
  `aksi` enum('dibuat','diperbarui','dihapus') NOT NULL,
  `status_sebelum` enum('terjadwal','dalam_proses','selesai','dibatalkan') NULL,
  `status_sesudah` enum('terjadwal','dalam_proses','selesai','dibatalkan') NULL,
  `ringkasan` text NULL,
  `dilakukan_oleh` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `inv_pem_hist_village_date` (`village_id`,`created_at`),
  KEY `inv_pem_hist_village_asset` (`village_id`,`inventaris_id`),
  CONSTRAINT `inventaris_pemeliharaan_riwayat_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventaris_pemeliharaan_history_schedule_tenant_fk` FOREIGN KEY (`village_id`,`pemeliharaan_id`) REFERENCES `inventaris_pemeliharaan` (`village_id`,`id`) ON DELETE CASCADE,
  CONSTRAINT `inventaris_pemeliharaan_history_asset_tenant_fk` FOREIGN KEY (`village_id`,`inventaris_id`) REFERENCES `inventaris` (`village_id`,`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
