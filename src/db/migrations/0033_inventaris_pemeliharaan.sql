ALTER TABLE `inventaris`
  ADD COLUMN `penanggung_jawab` varchar(150) NULL,
  ADD COLUMN `jabatan_penanggung_jawab` varchar(100) NULL,
  ADD COLUMN `telepon_penanggung_jawab` varchar(30) NULL;
--> statement-breakpoint
CREATE TABLE `inventaris_pemeliharaan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `inventaris_id` int NOT NULL,
  `jenis` varchar(100) NOT NULL,
  `tanggal_rencana` date NOT NULL,
  `tanggal_selesai` date NULL,
  `status` enum('terjadwal','dalam_proses','selesai','dibatalkan') NOT NULL DEFAULT 'terjadwal',
  `biaya` decimal(15,2) NOT NULL DEFAULT '0.00',
  `pelaksana` varchar(150) NULL,
  `deskripsi` text NULL,
  `hasil` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `inv_pem_village_date` (`village_id`,`tanggal_rencana`),
  KEY `inv_pem_village_status` (`village_id`,`status`),
  CONSTRAINT `inventaris_pemeliharaan_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventaris_pemeliharaan_asset_tenant_fk` FOREIGN KEY (`village_id`,`inventaris_id`) REFERENCES `inventaris` (`village_id`,`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
