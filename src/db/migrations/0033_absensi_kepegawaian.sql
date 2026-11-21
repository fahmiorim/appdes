CREATE TABLE `cuti_kuota` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`pegawai_id` int NOT NULL,
	`tahun` int NOT NULL,
	`total` int NOT NULL DEFAULT 12,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cuti_kuota_id` PRIMARY KEY(`id`),
	CONSTRAINT `cuti_kuota_village_pegawai_tahun_uq` UNIQUE(`village_id`,`pegawai_id`,`tahun`)
);
--> statement-breakpoint
CREATE TABLE `cuti_pegawai` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`pegawai_id` int NOT NULL,
	`jenis` varchar(30) NOT NULL DEFAULT 'cuti_tahunan',
	`mulai` date NOT NULL,
	`selesai` date NOT NULL,
	`durasi` int NOT NULL,
	`alasan` text NOT NULL,
	`lampiran` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'menunggu',
	`catatan` text,
	`diputuskan_oleh` varchar(36),
	`diputuskan_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cuti_pegawai_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kepegawaian_dokumen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`pegawai_id` int NOT NULL,
	`judul` varchar(180) NOT NULL,
	`kategori` varchar(50) NOT NULL DEFAULT 'lainnya',
	`nomor` varchar(100),
	`tanggal` date,
	`berkas` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kepegawaian_dokumen_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kepegawaian_pegawai` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`perangkat_id` int,
	`nama` varchar(150) NOT NULL,
	`nip` varchar(30),
	`nik` varchar(16),
	`jabatan` varchar(150),
	`jenis_kelamin` varchar(10),
	`tempat_lahir` varchar(100),
	`tanggal_lahir` date,
	`alamat` varchar(500),
	`telepon` varchar(30),
	`email` varchar(150),
	`pendidikan` varchar(100),
	`status_pegawai` varchar(20) NOT NULL DEFAULT 'tetap',
	`status` varchar(20) NOT NULL DEFAULT 'aktif',
	`tanggal_masuk` date,
	`tanggal_keluar` date,
	`foto` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kepegawaian_pegawai_id` PRIMARY KEY(`id`),
	CONSTRAINT `kepegawaian_pegawai_village_id_uq` UNIQUE(`village_id`,`id`),
	CONSTRAINT `kepegawaian_pegawai_village_perangkat_uq` UNIQUE(`village_id`,`perangkat_id`)
);
--> statement-breakpoint
CREATE TABLE `kepegawaian_riwayat` (
	`id` int AUTO_INCREMENT NOT NULL,
	`village_id` int NOT NULL,
	`pegawai_id` int NOT NULL,
	`jabatan` varchar(150) NOT NULL,
	`unit_kerja` varchar(150),
	`nomor_sk` varchar(100),
	`mulai` date NOT NULL,
	`selesai` date,
	`keterangan` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kepegawaian_riwayat_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kehadiran_perangkat` ADD `pegawai_id` int;--> statement-breakpoint
ALTER TABLE `kehadiran_perangkat` ADD `latitude_masuk` varchar(30);--> statement-breakpoint
ALTER TABLE `kehadiran_perangkat` ADD `longitude_masuk` varchar(30);--> statement-breakpoint
ALTER TABLE `kehadiran_perangkat` ADD `foto_masuk` varchar(255);--> statement-breakpoint
ALTER TABLE `kehadiran_perangkat` ADD `catatan` varchar(500);--> statement-breakpoint
ALTER TABLE `kehadiran_pengaturan` ADD `latitude_kantor` varchar(30);--> statement-breakpoint
ALTER TABLE `kehadiran_pengaturan` ADD `longitude_kantor` varchar(30);--> statement-breakpoint
ALTER TABLE `kehadiran_pengaturan` ADD `radius_meter` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `kehadiran_pengaturan` ADD `toleransi_terlambat_menit` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `kehadiran_pengaturan` ADD `wajib_gps` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `kehadiran_pengaturan` ADD `wajib_foto` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `cuti_kuota` ADD CONSTRAINT `cuti_kuota_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cuti_kuota` ADD CONSTRAINT `cuti_kuota_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cuti_pegawai` ADD CONSTRAINT `cuti_pegawai_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cuti_pegawai` ADD CONSTRAINT `cuti_pegawai_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kepegawaian_dokumen` ADD CONSTRAINT `kepegawaian_dokumen_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kepegawaian_dokumen` ADD CONSTRAINT `kepegawaian_dokumen_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kepegawaian_pegawai` ADD CONSTRAINT `kepegawaian_pegawai_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kepegawaian_riwayat` ADD CONSTRAINT `kepegawaian_riwayat_village_id_villages_id_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kepegawaian_riwayat` ADD CONSTRAINT `kepegawaian_riwayat_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cuti_pegawai_village_status_idx` ON `cuti_pegawai` (`village_id`,`status`);--> statement-breakpoint
CREATE INDEX `cuti_pegawai_village_pegawai_idx` ON `cuti_pegawai` (`village_id`,`pegawai_id`);--> statement-breakpoint
CREATE INDEX `cuti_pegawai_village_dates_idx` ON `cuti_pegawai` (`village_id`,`mulai`,`selesai`);--> statement-breakpoint
CREATE INDEX `kepegawaian_dokumen_village_pegawai_idx` ON `kepegawaian_dokumen` (`village_id`,`pegawai_id`);--> statement-breakpoint
CREATE INDEX `kepegawaian_pegawai_village_status_idx` ON `kepegawaian_pegawai` (`village_id`,`status`);--> statement-breakpoint
CREATE INDEX `kepegawaian_pegawai_village_jabatan_idx` ON `kepegawaian_pegawai` (`village_id`,`jabatan`);--> statement-breakpoint
CREATE INDEX `kepegawaian_riwayat_village_pegawai_idx` ON `kepegawaian_riwayat` (`village_id`,`pegawai_id`);--> statement-breakpoint
ALTER TABLE `kehadiran_perangkat` ADD CONSTRAINT `kehadiran_perangkat_pegawai_tenant_fk` FOREIGN KEY (`village_id`,`pegawai_id`) REFERENCES `kepegawaian_pegawai`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `kehadiran_perangkat_village_tanggal_idx` ON `kehadiran_perangkat` (`village_id`,`tanggal`);--> statement-breakpoint
CREATE INDEX `kehadiran_perangkat_village_pegawai_idx` ON `kehadiran_perangkat` (`village_id`,`pegawai_id`);--> statement-breakpoint
CREATE INDEX `kehadiran_perangkat_village_status_idx` ON `kehadiran_perangkat` (`village_id`,`status`);