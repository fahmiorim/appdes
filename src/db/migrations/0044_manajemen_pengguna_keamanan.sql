CREATE TABLE IF NOT EXISTS `village_security_settings` (
  `village_id` int NOT NULL,
  `password_min_length` int NOT NULL DEFAULT 8,
  `require_uppercase` boolean NOT NULL DEFAULT true,
  `require_lowercase` boolean NOT NULL DEFAULT true,
  `require_number` boolean NOT NULL DEFAULT true,
  `require_symbol` boolean NOT NULL DEFAULT false,
  `session_timeout_minutes` int NOT NULL DEFAULT 30,
  `auto_logout_inactive` boolean NOT NULL DEFAULT true,
  `warn_before_session_end` boolean NOT NULL DEFAULT true,
  `concurrent_login` boolean NOT NULL DEFAULT false,
  `ip_restriction_enabled` boolean NOT NULL DEFAULT false,
  `allowed_ips` text,
  `updated_by` varchar(36),
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`village_id`),
  CONSTRAINT `village_security_settings_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE,
  CONSTRAINT `village_security_settings_user_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `village_blocked_ips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village_id` int NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `expires_at` timestamp NULL,
  `created_by` varchar(36),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `village_blocked_ip_uq` (`village_id`,`ip_address`),
  KEY `village_blocked_ip_lookup_idx` (`village_id`,`ip_address`,`expires_at`),
  CONSTRAINT `village_blocked_ip_village_fk` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE CASCADE,
  CONSTRAINT `village_blocked_ip_user_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
UPDATE `modules` child
INNER JOIN `modules` parent ON parent.`village_id`=child.`village_id` AND parent.`slug`='pengaturan-desa'
SET child.`parent_id`=parent.`id`
WHERE child.`slug` IN ('pengguna','grup-akses');
--> statement-breakpoint
INSERT INTO `modules` (`village_id`,`slug`,`name`,`url`,`icon`,`is_group`,`is_hidden`,`is_active`,`sort_order`,`parent_id`)
SELECT v.`id`,'audit-log','Aktivitas Pengguna','/pengaturan/pengguna/aktivitas','',0,1,1,3,
  COALESCE((SELECT p.`id` FROM `modules` p WHERE p.`village_id`=v.`id` AND p.`slug`='pengaturan-desa' LIMIT 1),0)
FROM `villages` v
WHERE NOT EXISTS (SELECT 1 FROM `modules` m WHERE m.`village_id`=v.`id` AND m.`slug`='audit-log');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`,`module_id`,`access`)
SELECT r.`id`,m.`id`,'read'
FROM `roles` r INNER JOIN `modules` m ON m.`village_id`=r.`village_id`
WHERE r.`slug`='administrator' AND m.`slug`='audit-log'
AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.`role_id`=r.`id` AND rp.`module_id`=m.`id`);
