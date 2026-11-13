-- B3 — Composite tenant FK untuk `inventaris_mutasi.inventaris_id`.
--
-- `inventaris_mutasi` menyimpan `village_id` dan `inventaris_id` NOT NULL,
-- sementara FK lama hanya mengikat `inventaris_id`. Database karena itu
-- menerima mutasi desa A yang menunjuk inventaris desa B. `inventaris`
-- mendapat `UNIQUE (village_id, id)` agar dapat menjadi parent composite FK,
-- lalu FK lama diganti composite dengan `ON DELETE CASCADE` yang sama seperti
-- sebelumnya (perilaku hapus aset tidak berubah).
--
-- Relasi `inventaris.kategori_id → inventaris_kategori.id` sengaja TIDAK diubah
-- di sini: FK itu memakai `ON DELETE SET NULL` sedangkan `village_id` anak
-- bersifat NOT NULL, sehingga composite FK akan mengubah semantik hapus
-- kategori. Keputusan itu menunggu maintainer; untuk sementara jalur aplikasi
-- memvalidasi kepemilikan kategori (lihat laporan Batch 3).
--
-- Preflight di bawah bersifat read-only terhadap data domain: ia hanya membaca
-- tabel child/parent lalu menulis temuan ke `_b3_inventaris_preflight_findings`.
-- Bila ditemukan orphan atau referensi lintas desa, statement pemicu gagal
-- dengan pesan berisi relasi dan jumlah baris, sehingga migration berhenti
-- sebelum satu pun constraint diubah. Tidak ada data legacy yang dihapus atau
-- dipindahkan otomatis.
DROP TABLE IF EXISTS `_b3_inventaris_preflight_findings`;
--> statement-breakpoint
CREATE TABLE `_b3_inventaris_preflight_findings` (
  `relasi` varchar(64) NOT NULL,
  `jenis` varchar(16) NOT NULL,
  `jumlah` bigint NOT NULL,
  PRIMARY KEY (`relasi`, `jenis`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b3_inventaris_preflight_findings` (`relasi`, `jenis`, `jumlah`)
SELECT t.relasi, t.jenis, t.jumlah
FROM (
  SELECT 'inventaris_mutasi.inventaris_id' AS relasi, 'orphan' AS jenis, COUNT(*) AS jumlah
  FROM `inventaris_mutasi` AS c
  LEFT JOIN `inventaris` AS p ON p.id = c.inventaris_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'inventaris_mutasi.inventaris_id', 'cross-tenant', COUNT(*)
  FROM `inventaris_mutasi` AS c
  JOIN `inventaris` AS p ON p.id = c.inventaris_id
  WHERE p.village_id <> c.village_id
) AS t
WHERE t.jumlah > 0;
--> statement-breakpoint
-- Pemicu gagal-closed tanpa stored routine: baris temuan disisipkan dua kali ke
-- kolom PRIMARY KEY sehingga MySQL berhenti dengan ER_DUP_ENTRY yang menyebut
-- relasi, jenis masalah, dan jumlah baris. Tanpa temuan, statement ini
-- menyisipkan nol baris dan migration lanjut.
DROP TABLE IF EXISTS `_b3_inventaris_preflight_abort`;
--> statement-breakpoint
CREATE TABLE `_b3_inventaris_preflight_abort` (
  `pesan` varchar(255) NOT NULL,
  PRIMARY KEY (`pesan`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b3_inventaris_preflight_abort` (`pesan`)
SELECT CONCAT('B3 inv: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b3_inventaris_preflight_findings`
UNION ALL
SELECT CONCAT('B3 inv: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b3_inventaris_preflight_findings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b3_inventaris_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b3_inventaris_preflight_findings`;
--> statement-breakpoint
ALTER TABLE `inventaris_mutasi` DROP FOREIGN KEY `inventaris_mutasi_inventaris_id_inventaris_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventaris` ADD CONSTRAINT `inventaris_village_id_uq` UNIQUE(`village_id`,`id`);
--> statement-breakpoint
ALTER TABLE `inventaris_mutasi` ADD CONSTRAINT `inventaris_mutasi_inventaris_tenant_fk` FOREIGN KEY (`village_id`,`inventaris_id`) REFERENCES `inventaris`(`village_id`,`id`) ON DELETE cascade ON UPDATE no action;
