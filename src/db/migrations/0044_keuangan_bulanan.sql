CREATE TABLE `keuangan_bulanan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`tahun` int NOT NULL,
	`bulan` int NOT NULL,
	`template_uuid` varchar(20) NOT NULL,
	`target` decimal(65,2) NOT NULL DEFAULT '0.00',
	`realisasi` decimal(65,2) NOT NULL DEFAULT '0.00',
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keuangan_bulanan_id` PRIMARY KEY(`id`),
	CONSTRAINT `keuangan_bulanan_village_year_month_account_uq` UNIQUE(`village_id`,`tahun`,`bulan`,`template_uuid`)
);
--> statement-breakpoint
ALTER TABLE `keuangan_bulanan` ADD CONSTRAINT `keuangan_bulanan_month_chk` CHECK (`bulan` BETWEEN 1 AND 12);--> statement-breakpoint
ALTER TABLE `keuangan_bulanan` ADD CONSTRAINT `keuangan_bulanan_year_chk` CHECK (`tahun` BETWEEN 2000 AND 2100);--> statement-breakpoint
ALTER TABLE `keuangan_bulanan` ADD CONSTRAINT `keuangan_bulanan_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `keuangan_bulanan` ADD CONSTRAINT `keuangan_bulanan_template_uuid_keuangan_template_uuid_fk` FOREIGN KEY (`template_uuid`) REFERENCES `keuangan_template`(`uuid`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `keuangan_bulanan` ADD CONSTRAINT `keuangan_bulanan_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `keuangan_bulanan_village_year_idx` ON `keuangan_bulanan` (`village_id`,`tahun`);
