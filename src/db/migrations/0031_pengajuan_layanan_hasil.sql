ALTER TABLE `pengajuan_layanan_berkas` ADD `jenis` varchar(20) NOT NULL DEFAULT 'persyaratan';
--> statement-breakpoint
CREATE INDEX `pengajuan_layanan_berkas_tenant_type_idx` ON `pengajuan_layanan_berkas` (`village_id`,`pengajuan_id`,`jenis`);