ALTER TABLE `inventaris_pemeliharaan`
  ADD COLUMN `kondisi_setelah` enum('baik','rusak_ringan','rusak_berat','dalam_perbaikan') NULL AFTER `status`;
