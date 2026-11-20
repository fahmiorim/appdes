CREATE TABLE `layanan_publik` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `nama` varchar(180) NOT NULL,
  `kategori` varchar(60) NOT NULL DEFAULT 'administrasi',
  `deskripsi` text,
  `persyaratan` text,
  `estimasi_hari` int NOT NULL DEFAULT 1,
  `biaya` int NOT NULL DEFAULT 0,
  `metode` varchar(80) NOT NULL DEFAULT 'online_dan_langsung',
  `aktif` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `layanan_publik_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `layanan_publik_village_active_idx` ON `layanan_publik` (`village_id`,`aktif`);
--> statement-breakpoint
CREATE INDEX `layanan_publik_village_name_idx` ON `layanan_publik` (`village_id`,`nama`);
--> statement-breakpoint
ALTER TABLE `layanan_publik` ADD CONSTRAINT `layanan_publik_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'pelayanan-publik','Pelayanan Publik',NULL,'♧',1,0,1,6,0 FROM `villages` v
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='pelayanan-publik');
--> statement-breakpoint
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'layanan-publik','Daftar Layanan','/pelayanan-publik/layanan','',0,0,1,1,COALESCE((SELECT p.`id` FROM `modules` p WHERE p.`village_id`=v.`id` AND p.`slug`='pelayanan-publik' LIMIT 1),0)
FROM `villages` v WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='layanan-publik');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'manage' FROM `roles` r INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator' AND m.`slug` IN ('pelayanan-publik','layanan-publik')
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
