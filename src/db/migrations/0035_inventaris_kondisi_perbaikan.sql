ALTER TABLE `inventaris`
  MODIFY COLUMN `kondisi` enum('baik','rusak_ringan','rusak_berat','dalam_perbaikan') NOT NULL DEFAULT 'baik';
--> statement-breakpoint
ALTER TABLE `inventaris_mutasi`
  MODIFY COLUMN `kondisi_baru` enum('baik','rusak_ringan','rusak_berat','dalam_perbaikan') NULL;
