CREATE TABLE `inventaris_dokumen` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `inventaris_id` int NOT NULL,
  `nama` varchar(200) NOT NULL,
  `nama_file` varchar(255) NOT NULL,
  `mime` varchar(100) NOT NULL,
  `ukuran` int NOT NULL,
  `jalur_media` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `inv_doc_village_asset` (`village_id`,`inventaris_id`),
  CONSTRAINT `inventaris_dokumen_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventaris_dokumen_asset_tenant_fk` FOREIGN KEY (`village_id`,`inventaris_id`) REFERENCES `inventaris` (`village_id`,`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
