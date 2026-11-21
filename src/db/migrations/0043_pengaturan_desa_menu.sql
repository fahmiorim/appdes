-- Pengaturan Desa menjadi grup induk untuk identitas, pengguna, dan akses.
UPDATE `modules`
SET `name`='Pengaturan Desa',`is_group`=1,`is_hidden`=0,`is_active`=1
WHERE `slug`='pengaturan' AND (`url` IS NULL OR `url`='/pengaturan');

--> statement-breakpoint
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'pengaturan-desa','Profil & Pengaturan','/pengaturan-desa','⚙',0,0,1,0,
  COALESCE((SELECT p.`id` FROM `modules` p WHERE p.`village_id`=v.`id` AND p.`slug`='pengaturan' LIMIT 1),0)
FROM `villages` v
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='pengaturan-desa');

--> statement-breakpoint
UPDATE `modules` child
INNER JOIN `modules` parent ON parent.`village_id`=child.`village_id` AND parent.`slug`='pengaturan'
SET child.`parent_id`=parent.`id`
WHERE child.`slug`='pengaturan-desa';

--> statement-breakpoint
-- Resource TTE dikelola dalam tab Integrasi & Sistem.
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'tte','Tanda Tangan Elektronik','/pengaturan-desa','⚙',0,1,1,101,0
FROM `villages` v
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='tte');

--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'manage'
FROM `roles` r
INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator' AND m.`slug` IN ('pengaturan','pengaturan-desa','tte')
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
