-- Menu pengaturan operasional tenant desa.
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'pengaturan-desa','Pengaturan Desa','/pengaturan-desa','⚙',0,0,1,99,0
FROM `villages` v
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='pengaturan-desa');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator' AND m.`slug`='pengaturan-desa'
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
--> statement-breakpoint
-- Pengaturan umum lama tetap diizinkan bagi administrator agar preferensi lama
-- (komentar, berita beranda, pendaftaran warga, penomoran surat) tetap berfungsi.
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator' AND m.`slug`='pengaturan'
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
