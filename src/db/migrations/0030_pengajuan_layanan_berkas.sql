CREATE TABLE `pengajuan_layanan_berkas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`pengajuan_id` int NOT NULL,
	`nama_persyaratan` varchar(180) NOT NULL,
	`jalur` varchar(500) NOT NULL,
	`nama_asli` varchar(255) NOT NULL,
	`mime` varchar(80) NOT NULL DEFAULT 'application/pdf',
	`ukuran` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pengajuan_layanan_berkas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pengajuan_layanan_berkas_tenant_request_idx` ON `pengajuan_layanan_berkas` (`village_id`,`pengajuan_id`);
--> statement-breakpoint
ALTER TABLE `pengajuan_layanan_berkas` ADD CONSTRAINT `pengajuan_layanan_berkas_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `pengajuan_layanan_berkas` ADD CONSTRAINT `pengajuan_layanan_berkas_request_tenant_fk` FOREIGN KEY (`village_id`,`pengajuan_id`) REFERENCES `pengajuan_layanan`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
