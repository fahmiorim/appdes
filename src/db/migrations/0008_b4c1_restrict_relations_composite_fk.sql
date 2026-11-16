-- AUD-034 Batch 4C-1: tenant composite FKs for two SET NULL relations whose
-- parents have no application delete path (`berita_kategori`, `jabatan_perangkat`).
-- No domain rows are changed. Preflight aborts before constraints change if
-- orphan/cross-tenant references exist. Helper tables are kept for diagnosis
-- when the migration aborts, and dropped when it succeeds.
--
-- Composite SET NULL tidak dapat dipakai karena `village_id` anak NOT NULL,
-- sehingga FK baru memakai ON DELETE RESTRICT. Perilaku hapus parent berubah:
-- penghapusan manual/DBA ditolak selama masih dirujuk, bukan mengosongkan kolom.
-- Kolom child tetap nullable dan `SET NULL` lewat update aplikasi tetap sah.

DROP TABLE IF EXISTS _b4c1_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c1_tenant_preflight_findings;
--> statement-breakpoint
CREATE TABLE _b4c1_tenant_preflight_findings (
  relasi varchar(100) NOT NULL,
  jenis varchar(16) NOT NULL,
  jumlah bigint NOT NULL,
  kode_pesan varchar(48) NOT NULL,
  PRIMARY KEY (relasi, jenis)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO _b4c1_tenant_preflight_findings (relasi, jenis, jumlah, kode_pesan)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'berita.kategori_id' relasi, 'orphan' jenis, COUNT(*) jumlah, 'berita.kategori_id' kode_pesan
  FROM berita c LEFT JOIN berita_kategori p ON p.id = c.kategori_id WHERE c.kategori_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'berita.kategori_id', 'cross-tenant', COUNT(*), 'berita.kategori_id'
  FROM berita c JOIN berita_kategori p ON p.id = c.kategori_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'perangkat_desa.jabatan_id', 'orphan', COUNT(*), 'perangkat.jabatan_id'
  FROM perangkat_desa c LEFT JOIN jabatan_perangkat p ON p.id = c.jabatan_id WHERE c.jabatan_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'perangkat_desa.jabatan_id', 'cross-tenant', COUNT(*), 'perangkat.jabatan_id'
  FROM perangkat_desa c JOIN jabatan_perangkat p ON p.id = c.jabatan_id WHERE p.village_id <> c.village_id
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE _b4c1_tenant_preflight_abort (
  pesan varchar(64) NOT NULL,
  PRIMARY KEY (pesan)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error stops migration while preserving full findings above.
INSERT INTO _b4c1_tenant_preflight_abort (pesan)
SELECT CONCAT('B4C1 ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4c1_tenant_preflight_findings
UNION ALL
SELECT CONCAT('B4C1 ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4c1_tenant_preflight_findings;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c1_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c1_tenant_preflight_findings;
--> statement-breakpoint

ALTER TABLE berita DROP FOREIGN KEY berita_kategori_id_berita_kategori_id_fk;
--> statement-breakpoint
ALTER TABLE perangkat_desa DROP FOREIGN KEY perangkat_desa_jabatan_id_jabatan_perangkat_id_fk;
--> statement-breakpoint

ALTER TABLE berita_kategori ADD CONSTRAINT `berita_kategori_village_id_uq` UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE jabatan_perangkat ADD CONSTRAINT `jabatan_perangkat_village_id_uq` UNIQUE (village_id, id);
--> statement-breakpoint

CREATE INDEX `berita_village_kategori_idx` ON berita (village_id, kategori_id);
--> statement-breakpoint
CREATE INDEX `perangkat_desa_village_jabatan_idx` ON perangkat_desa (village_id, jabatan_id);
--> statement-breakpoint

ALTER TABLE berita ADD CONSTRAINT `berita_kategori_tenant_fk` FOREIGN KEY (village_id, kategori_id) REFERENCES berita_kategori (village_id, id) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE perangkat_desa ADD CONSTRAINT `perangkat_desa_jabatan_tenant_fk` FOREIGN KEY (village_id, jabatan_id) REFERENCES jabatan_perangkat (village_id, id) ON DELETE RESTRICT ON UPDATE NO ACTION;
