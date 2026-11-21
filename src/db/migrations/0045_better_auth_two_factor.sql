ALTER TABLE `users` ADD COLUMN `two_factor_enabled` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `two_factor` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `secret` text NOT NULL,
  `backup_codes` text NOT NULL,
  `verified` boolean NOT NULL DEFAULT false,
  `failed_verification_count` int NOT NULL DEFAULT 0,
  `locked_until` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `two_factor_user_idx` (`user_id`),
  CONSTRAINT `two_factor_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
