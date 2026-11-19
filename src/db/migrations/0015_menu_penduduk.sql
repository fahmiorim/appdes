-- Menu Data Penduduk untuk seluruh tenant.
--
-- Halaman `/penduduk` sudah ada, tetapi tenant lama belum memiliki baris modul
-- sehingga sidebar tidak pernah menampilkannya. Backfill idempoten: tenant yang
-- sudah menyesuaikan menunya sendiri tidak ditimpa.

INSERT INTO `modules` (`village_id`, `slug`, `name`, `url`, `icon`, `is_group`, `is_hidden`, `is_active`, `sort_order`, `parent_id`)
SELECT v.`id`, 'penduduk', 'Data Penduduk', '/penduduk', '▤', 0, 0, 1, 3, 0
FROM `villages` v
WHERE NOT EXISTS (
  SELECT 1 FROM `modules` m
  WHERE m.`village_id` = v.`id` AND m.`slug` = 'penduduk'
);
--> statement-breakpoint

-- Administrator desa mengelola modul; role lain hanya membaca agar data
-- kependudukan tidak otomatis dapat diubah oleh semua pengguna.
INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id` = r.`village_id`
WHERE r.`slug` = 'administrator'
  AND m.`slug` = 'penduduk'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`module_id` = m.`id`
  );
--> statement-breakpoint

INSERT INTO `role_permissions` (`role_id`, `module_id`, `access`)
SELECT r.`id`, m.`id`, 'read'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id` = r.`village_id`
WHERE r.`slug` IN ('sekretaris', 'operator', 'kepala-desa')
  AND m.`slug` = 'penduduk'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.`role_id` = r.`id` AND rp.`module_id` = m.`id`
  );
