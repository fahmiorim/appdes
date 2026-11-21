ALTER TABLE `pembangunan_proyek`
  ADD COLUMN `latitude` DECIMAL(10,7) NULL AFTER `lokasi`,
  ADD COLUMN `longitude` DECIMAL(10,7) NULL AFTER `latitude`;
