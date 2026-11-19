CREATE TABLE `potensi_desa` (
	`id` int NOT NULL AUTO_INCREMENT,
	`village_id` int NOT NULL,
	`kategori` varchar(40) NOT NULL,
	`judul` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`ringkasan` varchar(500) NULL,
	`deskripsi` text NULL,
	`gambar` varchar(255) NULL,
	`lokasi` varchar(200) NULL,
	`kontak` varchar(150) NULL,
	`unggulan` boolean NOT NULL DEFAULT false,
	`aktif` boolean NOT NULL DEFAULT false,
	`urut` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `potensi_desa_id` PRIMARY KEY (`id`),
	CONSTRAINT `potensi_desa_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `potensi_desa_village_slug_uq` ON `potensi_desa` (`village_id`, `slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `potensi_desa_village_id_uq` ON `potensi_desa` (`village_id`, `id`);
--> statement-breakpoint
CREATE INDEX `potensi_desa_village_category_active_idx` ON `potensi_desa` (`village_id`, `kategori`, `aktif`, `urut`);
--> statement-breakpoint

CREATE TABLE `potensi_indikator` (
	`id` int NOT NULL AUTO_INCREMENT,
	`village_id` int NOT NULL,
	`potensi_id` int NOT NULL,
	`label` varchar(100) NOT NULL,
	`nilai` varchar(100) NOT NULL,
	`urut` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `potensi_indikator_id` PRIMARY KEY (`id`),
	CONSTRAINT `potensi_indikator_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE,
	CONSTRAINT `potensi_indikator_tenant_fk` FOREIGN KEY (`village_id`, `potensi_id`) REFERENCES `potensi_desa` (`village_id`, `id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `potensi_indikator_village_potensi_idx` ON `potensi_indikator` (`village_id`, `potensi_id`, `urut`);
