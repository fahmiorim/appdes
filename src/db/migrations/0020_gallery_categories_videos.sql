ALTER TABLE `galeri_album` ADD COLUMN `kategori` varchar(80) NULL AFTER `keterangan`;
--> statement-breakpoint
ALTER TABLE `galeri_album` ADD COLUMN `published_at` timestamp NULL AFTER `kategori`;
--> statement-breakpoint
CREATE INDEX `galeri_album_village_category_published_idx` ON `galeri_album` (`village_id`, `kategori`, `published_at`);
--> statement-breakpoint

CREATE TABLE `galeri_video` (
	`id` int NOT NULL AUTO_INCREMENT,
	`village_id` int NOT NULL,
	`judul` varchar(150) NOT NULL,
	`keterangan` text NULL,
	`url` varchar(500) NOT NULL,
	`provider` varchar(20) NOT NULL,
	`thumbnail` varchar(255) NULL,
	`aktif` boolean NOT NULL DEFAULT true,
	`published_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `galeri_video_id` PRIMARY KEY (`id`),
	CONSTRAINT `galeri_video_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE INDEX `galeri_video_village_published_idx` ON `galeri_video` (`village_id`, `aktif`, `published_at`);
