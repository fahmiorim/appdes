-- Modul Website Desa untuk seluruh tenant.
-- Backfill idempoten; tidak menimpa konfigurasi menu tenant yang sudah ada.
INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, 'website-desa', 'Website Desa', NULL, '◎', 1, 0, 1, 4, 0
FROM `villages` v
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m
  WHERE m.`village_id` = v.`id` AND m.`slug` = 'website-desa'
);
--> statement-breakpoint

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, child.`slug`, child.`name`, child.`url`, child.`icon`, 0, 0, 1, child.`sort_order`,
  COALESCE((SELECT p.`id` FROM `modules` p WHERE p.`village_id` = v.`id` AND p.`slug` = 'website-desa' LIMIT 1), 0)
FROM `villages` v
CROSS JOIN (
  SELECT 'website-dashboard' AS `slug`, 'Dashboard Website' AS `name`, '/website' AS `url`, '▦' AS `icon`, 1 AS `sort_order`
  UNION ALL SELECT 'website-pengaturan', 'Pengaturan Website', '/website/pengaturan', '⚙', 2
  UNION ALL SELECT 'website-halaman', 'Halaman & Navigasi', '/website/halaman', '☷', 3
  UNION ALL SELECT 'website-konten', 'Konten & Publikasi', '/website/konten', '▤', 4
  UNION ALL SELECT 'website-dokumen', 'Dokumen Publik', '/website/dokumen', '▧', 5
) AS child
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m
  WHERE m.`village_id` = v.`id` AND m.`slug` = child.`slug`
);
--> statement-breakpoint

-- Administrator desa mendapat hak kelola untuk lima halaman website.
INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id` = r.`village_id`
WHERE r.`slug` = 'administrator'
  AND m.`slug` IN ('website-desa', 'website-dashboard', 'website-pengaturan', 'website-halaman', 'website-konten', 'website-dokumen')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`module_id` = m.`id`
  );
