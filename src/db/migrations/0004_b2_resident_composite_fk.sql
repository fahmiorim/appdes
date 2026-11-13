-- B2 — Composite tenant FK untuk relasi `resident_id` yang sudah cascade.
--
-- Lima tabel child menyimpan `village_id` dan `resident_id` NOT NULL, sementara
-- `residents` sudah memiliki `UNIQUE (village_id, id)` sejak 0001. FK
-- single-column lama diganti composite agar database menolak referensi
-- penduduk dari desa lain.
--
-- Preflight di bawah bersifat read-only terhadap data domain: ia hanya membaca
-- tabel child/parent lalu menulis temuan ke `_b2_resident_preflight_findings`.
-- Bila ditemukan orphan atau referensi lintas desa, statement pemicu gagal
-- dengan pesan berisi relasi dan jumlah baris, sehingga migration berhenti
-- sebelum satu pun constraint diubah. Tidak ada data legacy yang dihapus atau
-- dipindahkan otomatis.
--
-- Semua relasi memakai ON DELETE CASCADE sehingga perilaku hapus penduduk tidak
-- berubah dibanding FK single-column sebelumnya.
DROP TABLE IF EXISTS `_b2_resident_preflight_findings`;
--> statement-breakpoint
CREATE TABLE `_b2_resident_preflight_findings` (
  `relasi` varchar(64) NOT NULL,
  `jenis` varchar(16) NOT NULL,
  `jumlah` bigint NOT NULL,
  PRIMARY KEY (`relasi`, `jenis`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b2_resident_preflight_findings` (`relasi`, `jenis`, `jumlah`)
SELECT t.relasi, t.jenis, t.jumlah
FROM (
  SELECT 'dokumen_warga.resident_id' AS relasi, 'orphan' AS jenis, COUNT(*) AS jumlah
  FROM `dokumen_warga` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'dokumen_warga.resident_id', 'cross-tenant', COUNT(*)
  FROM `dokumen_warga` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'kehadiran_izin.resident_id', 'orphan', COUNT(*)
  FROM `kehadiran_izin` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'kehadiran_izin.resident_id', 'cross-tenant', COUNT(*)
  FROM `kehadiran_izin` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'kelompok_anggota.resident_id', 'orphan', COUNT(*)
  FROM `kelompok_anggota` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'kelompok_anggota.resident_id', 'cross-tenant', COUNT(*)
  FROM `kelompok_anggota` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'verifikasi_kontak.resident_id', 'orphan', COUNT(*)
  FROM `verifikasi_kontak` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'verifikasi_kontak.resident_id', 'cross-tenant', COUNT(*)
  FROM `verifikasi_kontak` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'warga_pesan.resident_id', 'orphan', COUNT(*)
  FROM `warga_pesan` AS c
  LEFT JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.id IS NULL
  UNION ALL
  SELECT 'warga_pesan.resident_id', 'cross-tenant', COUNT(*)
  FROM `warga_pesan` AS c
  JOIN `residents` AS p ON p.id = c.resident_id
  WHERE p.village_id <> c.village_id
) AS t
WHERE t.jumlah > 0;
--> statement-breakpoint
-- Pemicu gagal-closed tanpa stored routine: baris temuan disisipkan dua kali ke
-- kolom PRIMARY KEY sehingga MySQL berhenti dengan ER_DUP_ENTRY yang menyebut
-- relasi, jenis masalah, dan jumlah baris. Tanpa temuan, statement ini
-- menyisipkan nol baris dan migration lanjut.
DROP TABLE IF EXISTS `_b2_resident_preflight_abort`;
--> statement-breakpoint
CREATE TABLE `_b2_resident_preflight_abort` (
  `pesan` varchar(255) NOT NULL,
  PRIMARY KEY (`pesan`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `_b2_resident_preflight_abort` (`pesan`)
SELECT CONCAT('B2 resident: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b2_resident_preflight_findings`
UNION ALL
SELECT CONCAT('B2 resident: ', relasi, ' ', jenis, ' = ', jumlah, ' baris')
FROM `_b2_resident_preflight_findings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b2_resident_preflight_abort`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_b2_resident_preflight_findings`;
--> statement-breakpoint
-- Index kolom anak dibuat sebelum FK agar InnoDB tidak membuat index otomatis
-- dengan nama constraint. Empat tabel lain sudah memiliki index
-- (village_id, resident_id) dari baseline.
CREATE INDEX `kelompok_anggota_village_resident_idx` ON `kelompok_anggota` (`village_id`,`resident_id`);
--> statement-breakpoint
ALTER TABLE `dokumen_warga` DROP FOREIGN KEY `dokumen_warga_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `kehadiran_izin` DROP FOREIGN KEY `kehadiran_izin_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `kelompok_anggota` DROP FOREIGN KEY `kelompok_anggota_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `verifikasi_kontak` DROP FOREIGN KEY `verifikasi_kontak_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `warga_pesan` DROP FOREIGN KEY `warga_pesan_resident_id_residents_id_fk`;
--> statement-breakpoint
ALTER TABLE `dokumen_warga` ADD CONSTRAINT `dokumen_warga_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `kehadiran_izin` ADD CONSTRAINT `kehadiran_izin_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `kelompok_anggota` ADD CONSTRAINT `kelompok_anggota_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `verifikasi_kontak` ADD CONSTRAINT `verifikasi_kontak_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `warga_pesan` ADD CONSTRAINT `warga_pesan_resident_tenant_fk` FOREIGN KEY (`village_id`,`resident_id`) REFERENCES `residents`(`village_id`,`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
