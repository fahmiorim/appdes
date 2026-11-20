CREATE TABLE `domain_dns_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain_id` int NOT NULL,
	`status` varchar(20) NOT NULL,
	`addresses` text,
	`error` varchar(255),
	`checked_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domain_dns_checks_id` PRIMARY KEY(`id`),
	CONSTRAINT `domain_dns_checks_domain_id_unique` UNIQUE(`domain_id`)
);
--> statement-breakpoint
ALTER TABLE `domain_dns_checks` ADD CONSTRAINT `domain_dns_checks_domain_id_village_domains_id_fk` FOREIGN KEY (`domain_id`) REFERENCES `village_domains`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `domain_dns_checks_status_idx` ON `domain_dns_checks` (`status`);