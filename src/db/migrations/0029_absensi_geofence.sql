-- Pengaturan lokasi kantor, radius geofence, dan verifikasi absensi mandiri.
ALTER TABLE `kehadiran_pengaturan`
  ADD COLUMN `latitude_kantor` varchar(30) NULL,
  ADD COLUMN `longitude_kantor` varchar(30) NULL,
  ADD COLUMN `radius_meter` int NOT NULL DEFAULT 100,
  ADD COLUMN `toleransi_terlambat_menit` int NOT NULL DEFAULT 0,
  ADD COLUMN `wajib_gps` boolean NOT NULL DEFAULT true,
  ADD COLUMN `wajib_foto` boolean NOT NULL DEFAULT true;
