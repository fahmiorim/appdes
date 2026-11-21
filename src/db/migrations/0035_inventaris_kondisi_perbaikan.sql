ALTER TABLE `inventaris`
  MODIFY COLUMN `kondisi` enum('baik','rusak_ringan','rusak_berat','dalam_perbaikan') NOT NULL DEFAULT 'baik';
--> statement-breakpoint
ALTER TABLE `inventaris_mutasi`
  MODIFY COLUMN `kondisi_baru` enum('baik','rusak_ringan','rusak_berat','dalam_perbaikan') NULL;
--> statement-breakpoint
ALTER TABLE `inventaris`
  ADD COLUMN `akumulasi_penyusutan` decimal(15,2) NOT NULL DEFAULT '0.00' AFTER `nilai_akhir`;
