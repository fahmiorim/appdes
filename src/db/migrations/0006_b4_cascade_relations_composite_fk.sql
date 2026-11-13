-- AUD-034 Batch 4A: tenant composite FKs for six CASCADE relations.
-- No domain rows are changed. Preflight aborts before constraints change if
-- orphan/cross-tenant references exist. Keep helper tables for diagnosis on abort.
-- galeri_foto.album_id is nullable: NULL continues to mean a standalone photo.

DROP TABLE IF EXISTS _b4_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4_tenant_preflight_findings;
--> statement-breakpoint
CREATE TABLE _b4_tenant_preflight_findings (
  relasi varchar(100) NOT NULL,
  jenis varchar(16) NOT NULL,
  jumlah bigint NOT NULL,
  kode_pesan varchar(48) NOT NULL,
  PRIMARY KEY (relasi, jenis)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO _b4_tenant_preflight_findings (relasi, jenis, jumlah, kode_pesan)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'bumindes_item.buku_id' relasi, 'orphan' jenis, COUNT(*) jumlah, 'buku_item.buku_id' kode_pesan
  FROM bumindes_item c LEFT JOIN bumindes_buku p ON p.id = c.buku_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'bumindes_item.buku_id', 'cross-tenant', COUNT(*), 'buku_item.buku_id'
  FROM bumindes_item c JOIN bumindes_buku p ON p.id = c.buku_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'bumindes_tanah_kas_mutasi.tanah_kas_id', 'orphan', COUNT(*), 'tanah_mutasi.tanah_kas_id'
  FROM bumindes_tanah_kas_mutasi c LEFT JOIN bumindes_tanah_kas p ON p.id = c.tanah_kas_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'bumindes_tanah_kas_mutasi.tanah_kas_id', 'cross-tenant', COUNT(*), 'tanah_mutasi.tanah_kas_id'
  FROM bumindes_tanah_kas_mutasi c JOIN bumindes_tanah_kas p ON p.id = c.tanah_kas_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'galeri_foto.album_id', 'orphan', COUNT(*), 'galeri_foto.album_id'
  FROM galeri_foto c LEFT JOIN galeri_album p ON p.id = c.album_id WHERE c.album_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'galeri_foto.album_id', 'cross-tenant', COUNT(*), 'galeri_foto.album_id'
  FROM galeri_foto c JOIN galeri_album p ON p.id = c.album_id WHERE c.album_id IS NOT NULL AND p.village_id <> c.village_id
  UNION ALL
  SELECT 'lapak_produk.lapak_id', 'orphan', COUNT(*), 'lapak_produk.lapak_id'
  FROM lapak_produk c LEFT JOIN lapak p ON p.id = c.lapak_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'lapak_produk.lapak_id', 'cross-tenant', COUNT(*), 'lapak_produk.lapak_id'
  FROM lapak_produk c JOIN lapak p ON p.id = c.lapak_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'bukti_pengiriman_notifikasi.pengaduan_id', 'orphan', COUNT(*), 'bukti_notif.pengaduan_id'
  FROM bukti_pengiriman_notifikasi c LEFT JOIN pengaduan p ON p.id = c.pengaduan_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'bukti_pengiriman_notifikasi.pengaduan_id', 'cross-tenant', COUNT(*), 'bukti_notif.pengaduan_id'
  FROM bukti_pengiriman_notifikasi c JOIN pengaduan p ON p.id = c.pengaduan_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'pemilihan_kandidat.pemilihan_id', 'orphan', COUNT(*), 'pemilihan_kandidat.pemilihan_id'
  FROM pemilihan_kandidat c LEFT JOIN pemilihan p ON p.id = c.pemilihan_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'pemilihan_kandidat.pemilihan_id', 'cross-tenant', COUNT(*), 'pemilihan_kandidat.pemilihan_id'
  FROM pemilihan_kandidat c JOIN pemilihan p ON p.id = c.pemilihan_id WHERE p.village_id <> c.village_id
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE _b4_tenant_preflight_abort (
  pesan varchar(64) NOT NULL,
  PRIMARY KEY (pesan)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error stops migration while preserving full findings above.
INSERT INTO _b4_tenant_preflight_abort (pesan)
SELECT CONCAT('B4 ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4_tenant_preflight_findings
UNION ALL
SELECT CONCAT('B4 ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4_tenant_preflight_findings;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4_tenant_preflight_findings;
--> statement-breakpoint

ALTER TABLE bumindes_item DROP FOREIGN KEY bumindes_item_buku_id_bumindes_buku_id_fk;
--> statement-breakpoint
ALTER TABLE bumindes_tanah_kas_mutasi DROP FOREIGN KEY bumindes_tanah_kas_mutasi_tanah_kas_id_bumindes_tanah_kas_id_fk;
--> statement-breakpoint
ALTER TABLE galeri_foto DROP FOREIGN KEY galeri_foto_album_id_galeri_album_id_fk;
--> statement-breakpoint
ALTER TABLE lapak_produk DROP FOREIGN KEY lapak_produk_lapak_id_lapak_id_fk;
--> statement-breakpoint
ALTER TABLE bukti_pengiriman_notifikasi DROP FOREIGN KEY bukti_pengiriman_notifikasi_pengaduan_id_pengaduan_id_fk;
--> statement-breakpoint
ALTER TABLE pemilihan_kandidat DROP FOREIGN KEY pemilihan_kandidat_pemilihan_id_pemilihan_id_fk;
--> statement-breakpoint

ALTER TABLE bumindes_buku ADD CONSTRAINT bumindes_buku_village_id_uq UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE bumindes_tanah_kas ADD CONSTRAINT bumindes_tanah_kas_village_id_uq UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE galeri_album ADD CONSTRAINT galeri_album_village_id_uq UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE lapak ADD CONSTRAINT lapak_village_id_uq UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE pengaduan ADD CONSTRAINT pengaduan_village_id_uq UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE pemilihan ADD CONSTRAINT pemilihan_village_id_uq UNIQUE (village_id, id);
--> statement-breakpoint

ALTER TABLE bumindes_item ADD INDEX bumindes_item_village_buku_idx (village_id, buku_id);
--> statement-breakpoint
ALTER TABLE bumindes_tanah_kas_mutasi ADD INDEX bumindes_tanah_kas_mutasi_tenant_idx (village_id, tanah_kas_id);
--> statement-breakpoint
ALTER TABLE galeri_foto ADD INDEX galeri_foto_village_album_idx (village_id, album_id);
--> statement-breakpoint
ALTER TABLE lapak_produk ADD INDEX lapak_produk_village_lapak_idx (village_id, lapak_id);
--> statement-breakpoint
ALTER TABLE bukti_pengiriman_notifikasi ADD INDEX bukti_pengiriman_village_pengaduan_idx (village_id, pengaduan_id);
--> statement-breakpoint
ALTER TABLE pemilihan_kandidat ADD INDEX pemilihan_kandidat_village_pemilihan_idx (village_id, pemilihan_id);
--> statement-breakpoint

ALTER TABLE bumindes_item ADD CONSTRAINT bumindes_item_buku_tenant_fk FOREIGN KEY (village_id, buku_id) REFERENCES bumindes_buku (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE bumindes_tanah_kas_mutasi ADD CONSTRAINT bumindes_tanah_kas_mutasi_persil_tenant_fk FOREIGN KEY (village_id, tanah_kas_id) REFERENCES bumindes_tanah_kas (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE galeri_foto ADD CONSTRAINT galeri_foto_album_tenant_fk FOREIGN KEY (village_id, album_id) REFERENCES galeri_album (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE lapak_produk ADD CONSTRAINT lapak_produk_lapak_tenant_fk FOREIGN KEY (village_id, lapak_id) REFERENCES lapak (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE bukti_pengiriman_notifikasi ADD CONSTRAINT bukti_pengiriman_pengaduan_tenant_fk FOREIGN KEY (village_id, pengaduan_id) REFERENCES pengaduan (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE pemilihan_kandidat ADD CONSTRAINT pemilihan_kandidat_parent_tenant_fk FOREIGN KEY (village_id, pemilihan_id) REFERENCES pemilihan (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
