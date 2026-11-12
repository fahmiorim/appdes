ALTER TABLE `families` DROP FOREIGN KEY `families_region_id_regions_id_fk`;
--> statement-breakpoint
ALTER TABLE `bulanan_anak` DROP FOREIGN KEY `bulanan_anak_posyandu_id_posyandu_id_fk`;
--> statement-breakpoint
ALTER TABLE `bulanan_anak` DROP FOREIGN KEY `bulanan_anak_kia_id_kia_id_fk`;
--> statement-breakpoint
ALTER TABLE `ibu_hamil` DROP FOREIGN KEY `ibu_hamil_posyandu_id_posyandu_id_fk`;
--> statement-breakpoint
ALTER TABLE `ibu_hamil` DROP FOREIGN KEY `ibu_hamil_kia_id_kia_id_fk`;
--> statement-breakpoint
ALTER TABLE `kia` DROP FOREIGN KEY `kia_ibu_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `kia` DROP FOREIGN KEY `kia_anak_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `letters` DROP FOREIGN KEY `letters_type_id_letter_types_id_fk`;
--> statement-breakpoint
ALTER TABLE `letters` DROP FOREIGN KEY `letters_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `permohonan_surat` DROP FOREIGN KEY `permohonan_surat_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `permohonan_surat` DROP FOREIGN KEY `permohonan_surat_letter_type_id_letter_types_id_fk`;
--> statement-breakpoint
ALTER TABLE `permohonan_surat` DROP FOREIGN KEY `permohonan_surat_letter_id_letters_id_fk`;
--> statement-breakpoint
ALTER TABLE `residents` DROP FOREIGN KEY `residents_family_id_families_id_fk`;
--> statement-breakpoint
ALTER TABLE `residents` DROP FOREIGN KEY `residents_rtm_id_rtm_id_fk`;
--> statement-breakpoint
ALTER TABLE `residents` DROP FOREIGN KEY `residents_region_id_regions_id_fk`;
--> statement-breakpoint
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_from_region_id_regions_id_fk`;
--> statement-breakpoint
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_to_region_id_regions_id_fk`;
--> statement-breakpoint
ALTER TABLE `rtm` DROP FOREIGN KEY `rtm_region_id_regions_id_fk`;
--> statement-breakpoint
ALTER TABLE `families` ADD CONSTRAINT `families_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `kia` ADD CONSTRAINT `kia_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `posyandu` ADD CONSTRAINT `posyandu_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `letter_types` ADD CONSTRAINT `letter_types_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `letters` ADD CONSTRAINT `letters_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `regions` ADD CONSTRAINT `regions_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `residents` ADD CONSTRAINT `residents_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `rtm` ADD CONSTRAINT `rtm_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `families` ADD CONSTRAINT `families_region_tenant_fk` FOREIGN KEY (`village_id`,`region_id`) REFERENCES `regions`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bulanan_anak` ADD CONSTRAINT `bulanan_anak_posyandu_tenant_fk` FOREIGN KEY (`village_id`,`posyandu_id`) REFERENCES `posyandu`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bulanan_anak` ADD CONSTRAINT `bulanan_anak_kia_tenant_fk` FOREIGN KEY (`village_id`,`kia_id`) REFERENCES `kia`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ibu_hamil` ADD CONSTRAINT `ibu_hamil_posyandu_tenant_fk` FOREIGN KEY (`village_id`,`posyandu_id`) REFERENCES `posyandu`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ibu_hamil` ADD CONSTRAINT `ibu_hamil_kia_tenant_fk` FOREIGN KEY (`village_id`,`kia_id`) REFERENCES `kia`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kia` ADD CONSTRAINT `kia_ibu_tenant_fk` FOREIGN KEY (`village_id`,`ibu_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kia` ADD CONSTRAINT `kia_anak_tenant_fk` FOREIGN KEY (`village_id`,`anak_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `letters` ADD CONSTRAINT `letters_type_tenant_fk` FOREIGN KEY (`village_id`,`type_id`) REFERENCES `letter_types`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `letters` ADD CONSTRAINT `letters_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permohonan_surat` ADD CONSTRAINT `permohonan_surat_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permohonan_surat` ADD CONSTRAINT `permohonan_surat_type_tenant_fk` FOREIGN KEY (`village_id`,`letter_type_id`) REFERENCES `letter_types`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permohonan_surat` ADD CONSTRAINT `permohonan_surat_letter_tenant_fk` FOREIGN KEY (`village_id`,`letter_id`) REFERENCES `letters`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `residents` ADD CONSTRAINT `residents_family_tenant_fk` FOREIGN KEY (`village_id`,`family_id`) REFERENCES `families`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `residents` ADD CONSTRAINT `residents_rtm_tenant_fk` FOREIGN KEY (`village_id`,`rtm_id`) REFERENCES `rtm`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `residents` ADD CONSTRAINT `residents_region_tenant_fk` FOREIGN KEY (`village_id`,`region_id`) REFERENCES `regions`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resident_mutations` ADD CONSTRAINT `resident_mutations_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resident_mutations` ADD CONSTRAINT `resident_mutations_from_region_tenant_fk` FOREIGN KEY (`village_id`,`from_region_id`) REFERENCES `regions`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resident_mutations` ADD CONSTRAINT `resident_mutations_to_region_tenant_fk` FOREIGN KEY (`village_id`,`to_region_id`) REFERENCES `regions`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rtm` ADD CONSTRAINT `rtm_region_tenant_fk` FOREIGN KEY (`village_id`,`region_id`) REFERENCES `regions`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `resident_mutations_village_resident_idx` ON `resident_mutations` (`village_id`,`resident_id`);--> statement-breakpoint
CREATE INDEX `resident_mutations_village_from_region_idx` ON `resident_mutations` (`village_id`,`from_region_id`);--> statement-breakpoint
CREATE INDEX `resident_mutations_village_to_region_idx` ON `resident_mutations` (`village_id`,`to_region_id`);