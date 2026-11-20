CREATE TABLE `riwayat_pengajuan_layanan` (
  `id` int AUTO_INCREMENT NOT NULL,
  `village_id` int NOT NULL,
  `pengajuan_id` int NOT NULL,
  `status_sebelumnya` varchar(24),
  `status_baru` varchar(24) NOT NULL,
  `catatan` text,
  `actor_id` varchar(36),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `riwayat_pengajuan_layanan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `riwayat_pengajuan_tenant_request_idx` ON `riwayat_pengajuan_layanan` (`village_id`,`pengajuan_id`,`created_at`);
--> statement-breakpoint
ALTER TABLE `riwayat_pengajuan_layanan` ADD CONSTRAINT `riwayat_pengajuan_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `riwayat_pengajuan_layanan` ADD CONSTRAINT `riwayat_pengajuan_request_tenant_fk` FOREIGN KEY (`village_id`,`pengajuan_id`) REFERENCES `pengajuan_layanan`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `riwayat_pengajuan_layanan` ADD CONSTRAINT `riwayat_pengajuan_actor_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
