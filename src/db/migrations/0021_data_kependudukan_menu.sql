-- Group and child navigation for Admin Desa population management.
INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, 'data-kependudukan', 'Data Kependudukan', NULL, '♙', 1, 0, 1, 5, 0
FROM `villages` v
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m WHERE m.`village_id` = v.`id` AND m.`slug` = 'data-kependudukan'
);
--> statement-breakpoint

UPDATE `modules` m
INNER JOIN `modules` p ON p.`village_id` = m.`village_id` AND p.`slug` = 'data-kependudukan'
SET m.`parent_id` = p.`id`, m.`sort_order` = 2, m.`name` = 'Data Penduduk'
WHERE m.`slug` = 'penduduk';
--> statement-breakpoint

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, child.`slug`, child.`name`, child.`url`, child.`icon`, 0, 0, 1, child.`sort_order`, p.`id`
FROM `villages` v
INNER JOIN `modules` p ON p.`village_id` = v.`id` AND p.`slug` = 'data-kependudukan'
CROSS JOIN (
  SELECT 'dashboard-kependudukan' AS `slug`, 'Dashboard' AS `name`, '/penduduk/dashboard' AS `url`, '▦' AS `icon`, 1 AS `sort_order`
  UNION ALL SELECT 'keluarga', 'Kartu Keluarga', '/keluarga', '⌂', 3
  UNION ALL SELECT 'mutasi-penduduk', 'Mutasi Penduduk', '/mutasi-penduduk', '⇄', 4
  UNION ALL SELECT 'laporan-penduduk', 'Statistik & Laporan', '/statistik/penduduk', '▥', 5
) child
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m WHERE m.`village_id` = v.`id` AND m.`slug` = child.`slug`
);
--> statement-breakpoint

-- Normalisasi parent dan URL untuk modul yang mungkin sudah ada pada tenant lama.
UPDATE `modules` child
INNER JOIN `modules` parent ON parent.`village_id` = child.`village_id` AND parent.`slug` = 'data-kependudukan'
SET child.`parent_id` = parent.`id`,
    child.`url` = CASE child.`slug`
      WHEN 'dashboard-kependudukan' THEN '/penduduk/dashboard'
      WHEN 'penduduk' THEN '/penduduk'
      WHEN 'keluarga' THEN '/keluarga'
      WHEN 'mutasi-penduduk' THEN '/mutasi-penduduk'
      WHEN 'laporan-penduduk' THEN '/statistik/penduduk'
      ELSE child.`url`
    END
WHERE child.`slug` IN ('dashboard-kependudukan', 'penduduk', 'keluarga', 'mutasi-penduduk', 'laporan-penduduk');
--> statement-breakpoint

--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id` = r.`village_id`
WHERE r.`slug` = 'administrator'
  AND m.`slug` IN ('data-kependudukan', 'dashboard-kependudukan', 'penduduk', 'keluarga', 'mutasi-penduduk', 'laporan-penduduk')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`module_id` = m.`id`
  );

--> statement-breakpoint

-- Role yang sebelumnya sudah dapat membaca Data Penduduk tetap melihat grup dan dashboard.
INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT existing.`role_id`, target.`id`, 'read'
FROM `role_permissions` existing
INNER JOIN `modules` source ON source.`id` = existing.`module_id` AND source.`slug` = 'penduduk'
INNER JOIN `modules` target ON target.`village_id` = source.`village_id` AND target.`slug` = 'data-kependudukan'
WHERE existing.`access` IN ('read', 'write', 'manage')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = existing.`role_id` AND rp.`module_id` = target.`id`
  );
--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT existing.`role_id`, target.`id`, 'read'
FROM `role_permissions` existing
INNER JOIN `modules` source ON source.`id` = existing.`module_id` AND source.`slug` = 'penduduk'
INNER JOIN `modules` target ON target.`village_id` = source.`village_id` AND target.`slug` = 'dashboard-kependudukan'
WHERE existing.`access` IN ('read', 'write', 'manage')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = existing.`role_id` AND rp.`module_id` = target.`id`
  );

--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'read'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id` = r.`village_id`
WHERE r.`slug` IN ('sekretaris', 'operator', 'kepala-desa')
  AND m.`slug` = 'laporan-penduduk'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`module_id` = m.`id`
  );
