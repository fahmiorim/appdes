ALTER TABLE `inventaris`
  ADD COLUMN `umur_manfaat_bulan` int NULL AFTER `akumulasi_penyusutan`,
  ADD COLUMN `nilai_residu` decimal(15,2) NOT NULL DEFAULT '0.00' AFTER `umur_manfaat_bulan`,
  ADD COLUMN `tanggal_mulai_penyusutan` date NULL AFTER `nilai_residu`;
--> statement-breakpoint
CREATE TABLE `inventaris_penanggung_jawab_riwayat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `inventaris_id` int NOT NULL,
  `nama_sebelum` varchar(150) NULL,
  `jabatan_sebelum` varchar(100) NULL,
  `telepon_sebelum` varchar(30) NULL,
  `nama_sesudah` varchar(150) NULL,
  `jabatan_sesudah` varchar(100) NULL,
  `telepon_sesudah` varchar(30) NULL,
  `diubah_oleh` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `inv_pj_village_asset_date` (`village_id`,`inventaris_id`,`created_at`),
  CONSTRAINT `inventaris_penanggung_jawab_riwayat_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventaris_pj_history_asset_tenant_fk` FOREIGN KEY (`village_id`,`inventaris_id`) REFERENCES `inventaris` (`village_id`,`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
