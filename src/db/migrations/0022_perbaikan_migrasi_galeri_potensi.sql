-- Perbaikan migration 0020 dan 0021 yang dapat dilewati Drizzle.
-- Nilai `when` 0020/0021 lebih kecil dari 0019, sehingga database yang sudah
-- menerapkan 0019 tidak pernah membuat kolom galeri maupun tabel potensi.
-- Migration ini idempotent: database yang sudah lengkap tidak berubah, sedangkan
-- database yang melewatkan 0020/0021 dilengkapi tanpa mengedit migration lama.

SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `galeri_album` ADD COLUMN `kategori` varchar(80) NULL AFTER `keterangan`',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'galeri_album'
    AND COLUMN_NAME = 'kategori'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
--> statement-breakpoint
SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `galeri_album` ADD COLUMN `published_at` timestamp NULL AFTER `kategori`',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'galeri_album'
    AND COLUMN_NAME = 'published_at'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
--> statement-breakpoint
SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `galeri_album_village_category_published_idx` ON `galeri_album` (`village_id`, `kategori`, `published_at`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'galeri_album'
    AND INDEX_NAME = 'galeri_album_village_category_published_idx'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `galeri_video` (
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
SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `galeri_video_village_published_idx` ON `galeri_video` (`village_id`, `aktif`, `published_at`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'galeri_video'
    AND INDEX_NAME = 'galeri_video_village_published_idx'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `potensi_desa` (
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
SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE UNIQUE INDEX `potensi_desa_village_slug_uq` ON `potensi_desa` (`village_id`, `slug`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'potensi_desa'
    AND INDEX_NAME = 'potensi_desa_village_slug_uq'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
--> statement-breakpoint
SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE UNIQUE INDEX `potensi_desa_village_id_uq` ON `potensi_desa` (`village_id`, `id`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'potensi_desa'
    AND INDEX_NAME = 'potensi_desa_village_id_uq'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
--> statement-breakpoint
SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `potensi_desa_village_category_active_idx` ON `potensi_desa` (`village_id`, `kategori`, `aktif`, `urut`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'potensi_desa'
    AND INDEX_NAME = 'potensi_desa_village_category_active_idx'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `potensi_indikator` (
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
SET @sql_perbaikan := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `potensi_indikator_village_potensi_idx` ON `potensi_indikator` (`village_id`, `potensi_id`, `urut`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'potensi_indikator'
    AND INDEX_NAME = 'potensi_indikator_village_potensi_idx'
);
--> statement-breakpoint
PREPARE perbaikan_0022 FROM @sql_perbaikan;
--> statement-breakpoint
EXECUTE perbaikan_0022;
--> statement-breakpoint
DEALLOCATE PREPARE perbaikan_0022;
