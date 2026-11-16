-- AUD-034 Batch 4B: tenant composite FKs for five CASCADE relations.
-- No domain rows are changed. Preflight aborts before constraints change if
-- orphan/cross-tenant references exist. Helper tables are kept for diagnosis
-- when the migration aborts, and dropped when it succeeds.
--
-- Semua kolom child di batch ini NOT NULL dan FK lama memakai ON DELETE CASCADE,
-- sehingga composite FK tidak mengubah perilaku hapus. `kelompok` sudah memiliki
-- UNIQUE (village_id, id) sejak migration 0003; empat parent lain mendapatkannya
-- di sini.

DROP TABLE IF EXISTS _b4b_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4b_tenant_preflight_findings;
--> statement-breakpoint
CREATE TABLE _b4b_tenant_preflight_findings (
  relasi varchar(100) NOT NULL,
  jenis varchar(16) NOT NULL,
  jumlah bigint NOT NULL,
  kode_pesan varchar(48) NOT NULL,
  PRIMARY KEY (relasi, jenis)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO _b4b_tenant_preflight_findings (relasi, jenis, jumlah, kode_pesan)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'anggota_grup_kontak.kontak_id' relasi, 'orphan' jenis, COUNT(*) jumlah, 'anggota_kontak.kontak_id' kode_pesan
  FROM anggota_grup_kontak c LEFT JOIN kontak p ON p.id = c.kontak_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'anggota_grup_kontak.kontak_id', 'cross-tenant', COUNT(*), 'anggota_kontak.kontak_id'
  FROM anggota_grup_kontak c JOIN kontak p ON p.id = c.kontak_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'anggota_grup_kontak.grup_id', 'orphan', COUNT(*), 'anggota_kontak.grup_id'
  FROM anggota_grup_kontak c LEFT JOIN kontak_grup p ON p.id = c.grup_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'anggota_grup_kontak.grup_id', 'cross-tenant', COUNT(*), 'anggota_kontak.grup_id'
  FROM anggota_grup_kontak c JOIN kontak_grup p ON p.id = c.grup_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'incoming_letter_dispositions.incoming_letter_id', 'orphan', COUNT(*), 'ild.incoming_letter_id'
  FROM incoming_letter_dispositions c LEFT JOIN incoming_letters p ON p.id = c.incoming_letter_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'incoming_letter_dispositions.incoming_letter_id', 'cross-tenant', COUNT(*), 'ild.incoming_letter_id'
  FROM incoming_letter_dispositions c JOIN incoming_letters p ON p.id = c.incoming_letter_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'outgoing_letter_shipments.outgoing_letter_id', 'orphan', COUNT(*), 'ols.outgoing_letter_id'
  FROM outgoing_letter_shipments c LEFT JOIN outgoing_letters p ON p.id = c.outgoing_letter_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'outgoing_letter_shipments.outgoing_letter_id', 'cross-tenant', COUNT(*), 'ols.outgoing_letter_id'
  FROM outgoing_letter_shipments c JOIN outgoing_letters p ON p.id = c.outgoing_letter_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'kelompok_anggota.kelompok_id', 'orphan', COUNT(*), 'kelompok_anggota.kelompok_id'
  FROM kelompok_anggota c LEFT JOIN kelompok p ON p.id = c.kelompok_id WHERE p.id IS NULL
  UNION ALL
  SELECT 'kelompok_anggota.kelompok_id', 'cross-tenant', COUNT(*), 'kelompok_anggota.kelompok_id'
  FROM kelompok_anggota c JOIN kelompok p ON p.id = c.kelompok_id WHERE p.village_id <> c.village_id
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE _b4b_tenant_preflight_abort (
  pesan varchar(64) NOT NULL,
  PRIMARY KEY (pesan)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error stops migration while preserving full findings above.
INSERT INTO _b4b_tenant_preflight_abort (pesan)
SELECT CONCAT('B4B ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4b_tenant_preflight_findings
UNION ALL
SELECT CONCAT('B4B ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4b_tenant_preflight_findings;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4b_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4b_tenant_preflight_findings;
--> statement-breakpoint

ALTER TABLE anggota_grup_kontak DROP FOREIGN KEY anggota_grup_kontak_kontak_id_kontak_id_fk;
--> statement-breakpoint
ALTER TABLE anggota_grup_kontak DROP FOREIGN KEY anggota_grup_kontak_grup_id_kontak_grup_id_fk;
--> statement-breakpoint
ALTER TABLE incoming_letter_dispositions DROP FOREIGN KEY ild_incoming_letter_id_fk;
--> statement-breakpoint
ALTER TABLE outgoing_letter_shipments DROP FOREIGN KEY ols_outgoing_letter_id_fk;
--> statement-breakpoint
ALTER TABLE kelompok_anggota DROP FOREIGN KEY kelompok_anggota_kelompok_id_kelompok_id_fk;
--> statement-breakpoint

ALTER TABLE kontak ADD CONSTRAINT `kontak_village_id_uq` UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE kontak_grup ADD CONSTRAINT `kontak_grup_village_id_uq` UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE incoming_letters ADD CONSTRAINT `incoming_letters_village_id_uq` UNIQUE (village_id, id);
--> statement-breakpoint
ALTER TABLE outgoing_letters ADD CONSTRAINT `outgoing_letters_village_id_uq` UNIQUE (village_id, id);
--> statement-breakpoint

CREATE INDEX `anggota_grup_kontak_village_grup_idx` ON anggota_grup_kontak (village_id, grup_id);
--> statement-breakpoint
CREATE INDEX `anggota_grup_kontak_village_kontak_idx` ON anggota_grup_kontak (village_id, kontak_id);
--> statement-breakpoint
CREATE INDEX `ild_village_letter_idx` ON incoming_letter_dispositions (village_id, incoming_letter_id);
--> statement-breakpoint
CREATE INDEX `ols_village_letter_idx` ON outgoing_letter_shipments (village_id, outgoing_letter_id);
--> statement-breakpoint
CREATE INDEX `kelompok_anggota_village_kelompok_idx` ON kelompok_anggota (village_id, kelompok_id);
--> statement-breakpoint

ALTER TABLE anggota_grup_kontak ADD CONSTRAINT `anggota_grup_kontak_kontak_tenant_fk` FOREIGN KEY (village_id, kontak_id) REFERENCES kontak (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE anggota_grup_kontak ADD CONSTRAINT `anggota_grup_kontak_grup_tenant_fk` FOREIGN KEY (village_id, grup_id) REFERENCES kontak_grup (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE incoming_letter_dispositions ADD CONSTRAINT `ild_incoming_letter_tenant_fk` FOREIGN KEY (village_id, incoming_letter_id) REFERENCES incoming_letters (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE outgoing_letter_shipments ADD CONSTRAINT `ols_outgoing_letter_tenant_fk` FOREIGN KEY (village_id, outgoing_letter_id) REFERENCES outgoing_letters (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE kelompok_anggota ADD CONSTRAINT `kelompok_anggota_kelompok_tenant_fk` FOREIGN KEY (village_id, kelompok_id) REFERENCES kelompok (village_id, id) ON DELETE CASCADE ON UPDATE NO ACTION;
