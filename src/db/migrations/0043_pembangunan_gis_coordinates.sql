ALTER TABLE `pembangunan_proyek` ADD `latitude` decimal(10,7) AFTER `lokasi`;--> statement-breakpoint
ALTER TABLE `pembangunan_proyek` ADD `longitude` decimal(10,7) AFTER `latitude`;--> statement-breakpoint
ALTER TABLE `pembangunan_proyek` ADD CONSTRAINT `pembangunan_proyek_latitude_chk` CHECK (`latitude` IS NULL OR `latitude` BETWEEN -90 AND 90);--> statement-breakpoint
ALTER TABLE `pembangunan_proyek` ADD CONSTRAINT `pembangunan_proyek_longitude_chk` CHECK (`longitude` IS NULL OR `longitude` BETWEEN -180 AND 180);
