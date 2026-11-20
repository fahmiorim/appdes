CREATE TABLE `pengajuan_layanan` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `layanan_id` int NOT NULL,
  `resident_id` int,
  `nomor_tiket` varchar(40) NOT NULL,
  `nama_pemohon` varchar(150) NOT NULL,
  `nik` varchar(16),
  `telepon` varchar(30),
  `email` varchar(150),
  `alamat` text,
  `keperluan` text NOT NULL,
  `lampiran` text,
  `status` varchar(24) NOT NULL DEFAULT 'diajukan',
  `catatan_petugas` text,
  `alasan_penolakan` text,
  `petugas_id` varchar(36),
  `diproses_pada` timestamp,
  `selesai_pada` timestamp,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pengajuan_layanan_id` PRIMARY KEY(`id`),
  CONSTRAINT `pengajuan_layanan_village_ticket_uq` UNIQUE(`village_id`,`nomor_tiket`),
  CONSTRAINT `pengajuan_layanan_village_id_uq` UNIQUE(`village_id`,`id`)
);
--> statement-breakpoint
CREATE INDEX `pengajuan_layanan_tenant_status_idx` ON `pengajuan_layanan` (`village_id`,`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `pengajuan_layanan_tenant_layanan_idx` ON `pengajuan_layanan` (`village_id`,`layanan_id`);
--> statement-breakpoint
ALTER TABLE `pengajuan_layanan` ADD CONSTRAINT `pengajuan_layanan_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `pengajuan_layanan` ADD CONSTRAINT `pengajuan_layanan_service_tenant_fk` FOREIGN KEY (`village_id`,`layanan_id`) REFERENCES `layanan_publik`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `pengajuan_layanan` ADD CONSTRAINT `pengajuan_layanan_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `pengajuan_layanan` ADD CONSTRAINT `pengajuan_layanan_petugas_fk` FOREIGN KEY (`petugas_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'pengajuan-layanan','Pengajuan Layanan','/pelayanan-publik/pengajuan','',0,0,1,2,COALESCE((SELECT p.`id` FROM `modules` p WHERE p.`village_id`=v.`id` AND p.`slug`='pelayanan-publik' LIMIT 1),0)
FROM `villages` v WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='pengajuan-layanan');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'manage' FROM `roles` r INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator' AND m.`slug`='pengajuan-layanan'
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
