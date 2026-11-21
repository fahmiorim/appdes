CREATE TABLE `lembaga_anggota` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`lembaga_id` int NOT NULL,
	`nama` varchar(150) NOT NULL,
	`jabatan` varchar(100),
	`foto` varchar(255),
	`periode_mulai` date,
	`periode_selesai` date,
	`aktif` boolean NOT NULL DEFAULT true,
	`tampil_publik` boolean NOT NULL DEFAULT false,
	`urut` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lembaga_anggota_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lembaga_desa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`nama` varchar(150) NOT NULL,
	`jenis` varchar(50) NOT NULL DEFAULT 'lainnya',
	`deskripsi` text,
	`tugas_fungsi` text,
	`dasar_hukum` varchar(255),
	`masa_bakti_mulai` date,
	`masa_bakti_selesai` date,
	`status` varchar(20) NOT NULL DEFAULT 'aktif',
	`tampil_publik` boolean NOT NULL DEFAULT false,
	`urut` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lembaga_desa_id` PRIMARY KEY(`id`),
	CONSTRAINT `lembaga_desa_village_id_uq` UNIQUE(`village_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `pemerintahan_dokumen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`perangkat_id` int,
	`lembaga_id` int,
	`judul` varchar(180) NOT NULL,
	`nomor` varchar(100),
	`tanggal` date,
	`berkas` varchar(255) NOT NULL,
	`tampil_publik` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pemerintahan_dokumen_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `perangkat_riwayat_jabatan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`perangkat_id` int NOT NULL,
	`jabatan` varchar(150) NOT NULL,
	`nomor_sk` varchar(100),
	`mulai` date,
	`selesai` date,
	`keterangan` text,
	`tampil_publik` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `perangkat_riwayat_jabatan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `pendidikan` varchar(100);--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `telepon` varchar(30);--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `email` varchar(150);--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `alamat` varchar(255);--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `nomor_sk_pengangkatan` varchar(100);--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `tanggal_pengangkatan` date;--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `nomor_sk_pemberhentian` varchar(100);--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `tanggal_pemberhentian` date;--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD `atasan_id` int;--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `luas_wilayah` decimal(12,2);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `batas_utara` varchar(150);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `batas_selatan` varchar(150);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `batas_timur` varchar(150);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `batas_barat` varchar(150);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `ketinggian` varchar(100);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `suhu_rata_rata` varchar(100);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `curah_hujan` varchar(100);--> statement-breakpoint
ALTER TABLE `profil_desa` ADD `topografi` varchar(150);--> statement-breakpoint
ALTER TABLE `perangkat_desa` ADD CONSTRAINT `perangkat_desa_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `lembaga_anggota` ADD CONSTRAINT `lembaga_anggota_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lembaga_anggota` ADD CONSTRAINT `lembaga_anggota_tenant_fk` FOREIGN KEY (`village_id`,`lembaga_id`) REFERENCES `lembaga_desa`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lembaga_desa` ADD CONSTRAINT `lembaga_desa_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pemerintahan_dokumen` ADD CONSTRAINT `pemerintahan_dokumen_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pemerintahan_dokumen` ADD CONSTRAINT `pemerintahan_dokumen_perangkat_tenant_fk` FOREIGN KEY (`village_id`,`perangkat_id`) REFERENCES `perangkat_desa`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pemerintahan_dokumen` ADD CONSTRAINT `pemerintahan_dokumen_lembaga_tenant_fk` FOREIGN KEY (`village_id`,`lembaga_id`) REFERENCES `lembaga_desa`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `perangkat_riwayat_jabatan` ADD CONSTRAINT `perangkat_riwayat_jabatan_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `perangkat_riwayat_jabatan` ADD CONSTRAINT `perangkat_riwayat_tenant_fk` FOREIGN KEY (`village_id`,`perangkat_id`) REFERENCES `perangkat_desa`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lembaga_anggota_village_lembaga_idx` ON `lembaga_anggota` (`village_id`,`lembaga_id`);--> statement-breakpoint
CREATE INDEX `lembaga_desa_village_status_idx` ON `lembaga_desa` (`village_id`,`status`);--> statement-breakpoint
CREATE INDEX `pemerintahan_dokumen_village_idx` ON `pemerintahan_dokumen` (`village_id`);--> statement-breakpoint
CREATE INDEX `perangkat_riwayat_village_perangkat_idx` ON `perangkat_riwayat_jabatan` (`village_id`,`perangkat_id`);--> statement-breakpoint
CREATE INDEX `perangkat_desa_village_atasan_idx` ON `perangkat_desa` (`village_id`,`atasan_id`);