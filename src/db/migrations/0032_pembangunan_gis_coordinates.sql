ALTER TABLE `pembangunan_proyek`
  ADD COLUMN `latitude` DECIMAL(10,7) NULL AFTER `lokasi`,
  ADD COLUMN `longitude` DECIMAL(10,7) NULL AFTER `latitude`;

ALTER TABLE `pembangunan_proyek`
  ADD CONSTRAINT `pembangunan_proyek_latitude_chk` CHECK (`latitude` IS NULL OR `latitude` BETWEEN -90 AND 90),
  ADD CONSTRAINT `pembangunan_proyek_longitude_chk` CHECK (`longitude` IS NULL OR `longitude` BETWEEN -180 AND 180);
