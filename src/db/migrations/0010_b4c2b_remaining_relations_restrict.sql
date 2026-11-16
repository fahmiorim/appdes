-- AUD-034 Batch 4C-2b: tenant composite FKs for four SET NULL relations
-- whose parents have an application delete path (analisis, GIS, inventaris,
-- kelompok). Preflight aborts before changing constraints on orphan/cross-tenant
-- data; no domain rows are changed. RESTRICT replaces composite SET NULL because
-- child village_id is NOT NULL. Application repositories preserve SET NULL via
-- tenant-scoped transactions; inventaris/kelompok use-cases retain their
-- existing "in use" validation.

DROP TABLE IF EXISTS _b4c2b_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c2b_tenant_preflight_findings;
--> statement-breakpoint
CREATE TABLE _b4c2b_tenant_preflight_findings (
  relasi varchar(100) NOT NULL,
  jenis varchar(16) NOT NULL,
  jumlah bigint NOT NULL,
  kode_pesan varchar(48) NOT NULL,
  PRIMARY KEY (relasi, jenis)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO _b4c2b_tenant_preflight_findings (relasi, jenis, jumlah, kode_pesan)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'analisis_indikator.kategori_id' relasi, 'orphan' jenis, COUNT(*) jumlah, 'analisis.kategori' kode_pesan
  FROM analisis_indikator c LEFT JOIN analisis_kategori p ON p.id = c.kategori_id WHERE c.kategori_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'analisis_indikator.kategori_id', 'cross-tenant', COUNT(*), 'analisis.kategori'
  FROM analisis_indikator c JOIN analisis_kategori p ON p.id = c.kategori_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'area.ref_polygon', 'orphan', COUNT(*), 'area.polygon'
  FROM area c LEFT JOIN polygon p ON p.id = c.ref_polygon WHERE c.ref_polygon IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'area.ref_polygon', 'cross-tenant', COUNT(*), 'area.polygon'
  FROM area c JOIN polygon p ON p.id = c.ref_polygon WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'inventaris.kategori_id', 'orphan', COUNT(*), 'inventaris.kategori'
  FROM inventaris c LEFT JOIN inventaris_kategori p ON p.id = c.kategori_id WHERE c.kategori_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'inventaris.kategori_id', 'cross-tenant', COUNT(*), 'inventaris.kategori'
  FROM inventaris c JOIN inventaris_kategori p ON p.id = c.kategori_id WHERE p.village_id <> c.village_id
  UNION ALL
  SELECT 'kelompok.category_id', 'orphan', COUNT(*), 'kelompok.kategori'
  FROM kelompok c LEFT JOIN kelompok_master p ON p.id = c.category_id WHERE c.category_id IS NOT NULL AND p.id IS NULL
  UNION ALL
  SELECT 'kelompok.category_id', 'cross-tenant', COUNT(*), 'kelompok.kategori'
  FROM kelompok c JOIN kelompok_master p ON p.id = c.category_id WHERE p.village_id <> c.village_id
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE _b4c2b_tenant_preflight_abort (
  pesan varchar(64) NOT NULL,
  PRIMARY KEY (pesan)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error stops migration while preserving the findings above.
INSERT INTO _b4c2b_tenant_preflight_abort (pesan)
SELECT CONCAT('B4C2B ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4c2b_tenant_preflight_findings
UNION ALL
SELECT CONCAT('B4C2B ', kode_pesan, ' ', jenis, '=', jumlah)
FROM _b4c2b_tenant_preflight_findings;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c2b_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _b4c2b_tenant_preflight_findings;
--> statement-breakpoint

ALTER TABLE `analisis_indikator` DROP FOREIGN KEY `analisis_indikator_kategori_id_analisis_kategori_id_fk`;
--> statement-breakpoint
ALTER TABLE `area` DROP FOREIGN KEY `area_ref_polygon_polygon_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventaris` DROP FOREIGN KEY `inventaris_kategori_id_inventaris_kategori_id_fk`;
--> statement-breakpoint
ALTER TABLE `kelompok` DROP FOREIGN KEY `kelompok_category_id_kelompok_master_id_fk`;
--> statement-breakpoint
ALTER TABLE `analisis_kategori` ADD CONSTRAINT `analisis_kategori_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `polygon` ADD CONSTRAINT `polygon_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `inventaris_kategori` ADD CONSTRAINT `inventaris_kategori_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
ALTER TABLE `kelompok_master` ADD CONSTRAINT `kelompok_master_village_id_uq` UNIQUE(`village_id`,`id`);--> statement-breakpoint
CREATE INDEX `analisis_indikator_village_kategori_idx` ON `analisis_indikator` (`village_id`,`kategori_id`);--> statement-breakpoint
CREATE INDEX `kelompok_village_category_idx` ON `kelompok` (`village_id`,`category_id`);--> statement-breakpoint
ALTER TABLE `analisis_indikator` ADD CONSTRAINT `analisis_indikator_kategori_tenant_fk` FOREIGN KEY (`village_id`,`kategori_id`) REFERENCES `analisis_kategori`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `area` ADD CONSTRAINT `area_polygon_tenant_fk` FOREIGN KEY (`village_id`,`ref_polygon`) REFERENCES `polygon`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventaris` ADD CONSTRAINT `inventaris_kategori_tenant_fk` FOREIGN KEY (`village_id`,`kategori_id`) REFERENCES `inventaris_kategori`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kelompok` ADD CONSTRAINT `kelompok_category_tenant_fk` FOREIGN KEY (`village_id`,`category_id`) REFERENCES `kelompok_master`(`village_id`,`id`) ON DELETE restrict ON UPDATE no action;