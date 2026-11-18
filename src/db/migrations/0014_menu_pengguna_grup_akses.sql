-- Menu Pengaturan untuk modul pengguna dan grup akses.
--
-- `modules` adalah sumber sidebar, bukan `RUTE_ADMIN_TERSEDIA`. Tenant yang
-- sudah berjalan hanya memiliki modul beranda, sehingga dua halaman baru tidak
-- pernah muncul di navigasi. Backfill ini idempoten: baris yang sudah ada
-- dilewati, termasuk bila desa sudah menyesuaikan menu sendiri.

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, 'pengaturan', 'Pengaturan', NULL, '⚙', 1, 0, 1, 2, 0
FROM `villages` v
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m
  WHERE m.`village_id` = v.`id` AND m.`slug` = 'pengaturan'
);
--> statement-breakpoint

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT
  v.`id`,
  'pengguna',
  'Pengguna & Hak Akses',
  '/pengaturan/pengguna',
  '',
  0,
  0,
  1,
  1,
  COALESCE(
    (SELECT p.`id` FROM `modules` p
     WHERE p.`village_id` = v.`id` AND p.`slug` = 'pengaturan'
     LIMIT 1),
    0
  )
FROM `villages` v
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m
  WHERE m.`village_id` = v.`id` AND m.`slug` = 'pengguna'
);
--> statement-breakpoint

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT
  v.`id`,
  'grup-akses',
  'Grup Akses',
  '/pengaturan/grup-akses',
  '',
  0,
  0,
  1,
  2,
  COALESCE(
    (SELECT p.`id` FROM `modules` p
     WHERE p.`village_id` = v.`id` AND p.`slug` = 'pengaturan'
     LIMIT 1),
    0
  )
FROM `villages` v
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m
  WHERE m.`village_id` = v.`id` AND m.`slug` = 'grup-akses'
);
--> statement-breakpoint

-- Hanya administrator desa yang mendapat akses. Role lain tidak boleh melihat
-- menu pengguna tanpa grant eksplisit dari admin.
INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id` = r.`village_id`
WHERE r.`slug` = 'administrator'
  AND m.`slug` IN ('pengaturan', 'pengguna', 'grup-akses')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`module_id` = m.`id`
  );
