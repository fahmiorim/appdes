CREATE TABLE `tenant_domain_tombstones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`village_id` int NOT NULL,
	`purged_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_domain_tombstones_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_domain_tombstones_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `tenant_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`dibuat_oleh` varchar(36) NOT NULL,
	`berkas` varchar(255) NOT NULL,
	`ukuran_byte` int NOT NULL DEFAULT 0,
	`jumlah_baris` int NOT NULL DEFAULT 0,
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	`kedaluwarsa_pada` timestamp NOT NULL,
	CONSTRAINT `tenant_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_purge_archive` (
	`village_id` int NOT NULL,
	`ringkasan` text NOT NULL,
	`dibuat_oleh` varchar(36) NOT NULL,
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_purge_archive_village_id` PRIMARY KEY(`village_id`)
);
--> statement-breakpoint
ALTER TABLE `villages` ADD `nonaktif_sejak` timestamp;--> statement-breakpoint
ALTER TABLE `villages` ADD `purged_at` timestamp;--> statement-breakpoint
ALTER TABLE `tenant_domain_tombstones` ADD CONSTRAINT `tenant_domain_tombstones_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_exports` ADD CONSTRAINT `tenant_exports_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_purge_archive` ADD CONSTRAINT `tenant_purge_archive_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tenant_domain_tombstones_village_idx` ON `tenant_domain_tombstones` (`village_id`);--> statement-breakpoint
CREATE INDEX `tenant_exports_village_idx` ON `tenant_exports` (`village_id`,`dibuat_pada`);