-- Menu Laporan & Statistik lintas modul untuk setiap tenant desa.
INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, 'laporan-statistik', 'Laporan & Statistik', NULL, '▥', 1, 0, 1, 12, 0
FROM `villages` v
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m WHERE m.`village_id` = v.`id` AND m.`slug` = 'laporan-statistik'
);
--> statement-breakpoint

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, child.`slug`, child.`name`, child.`url`, child.`icon`, 0, 0, 1, child.`sort_order`, p.`id`
FROM `villages` v
INNER JOIN `modules` p ON p.`village_id` = v.`id` AND p.`slug` = 'laporan-statistik'
CROSS JOIN (
  SELECT 'laporan-statistik-dashboard' AS `slug`, 'Dashboard' AS `name`, '/laporan-statistik' AS `url`, '▦' AS `icon`, 1 AS `sort_order`
  UNION ALL SELECT 'laporan-desa', 'Laporan Desa', '/laporan-statistik/laporan-desa', '▤', 2
  UNION ALL SELECT 'statistik-desa', 'Statistik Desa', '/laporan-statistik/statistik-desa', '▥', 3
  UNION ALL SELECT 'rekap-analisis', 'Rekap & Analisis', '/laporan-statistik/rekap-analisis', '◫', 4
) child
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m WHERE m.`village_id` = v.`id` AND m.`slug` = child.`slug`
);
--> statement-breakpoint

UPDATE `modules` child
INNER JOIN `modules` parent ON parent.`village_id` = child.`village_id` AND parent.`slug` = 'laporan-statistik'
SET child.`parent_id` = parent.`id`
WHERE child.`slug` IN ('laporan-statistik-dashboard', 'laporan-desa', 'statistik-desa', 'rekap-analisis');
--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id` = r.`village_id`
WHERE r.`slug` = 'administrator'
  AND m.`slug` IN ('laporan-statistik', 'laporan-statistik-dashboard', 'laporan-desa', 'statistik-desa', 'rekap-analisis')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`module_id` = m.`id`
  );
--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT DISTINCT sourcePermission.`role_id`, target.`id`, 'read'
FROM `role_permissions` sourcePermission
INNER JOIN `modules` source ON source.`id` = sourcePermission.`module_id`
INNER JOIN `modules` target ON target.`village_id` = source.`village_id`
WHERE source.`slug` IN ('laporan-penduduk', 'laporan-keuangan', 'pembangunan', 'bantuan', 'kehadiran', 'analisis')
  AND sourcePermission.`access` IN ('read', 'write', 'manage')
  AND target.`slug` IN ('laporan-statistik', 'laporan-statistik-dashboard', 'laporan-desa', 'statistik-desa', 'rekap-analisis')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = sourcePermission.`role_id` AND rp.`module_id` = target.`id`
  );
