CREATE TABLE IF NOT EXISTS `password_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `password_history_user_created_idx` (`user_id`, `created_at`),
  CONSTRAINT `password_history_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
