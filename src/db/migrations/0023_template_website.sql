CREATE TABLE `website_template_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`version` varchar(20) NOT NULL,
	`changelog` text NOT NULL,
	`tokens` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `website_template_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `website_template_versions_template_version_unique` UNIQUE(`template_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `website_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(30) NOT NULL,
	`description` text NOT NULL,
	`version` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`tokens` text NOT NULL,
	`tags` text NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `website_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `website_templates_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `website_template_versions` ADD CONSTRAINT `website_template_versions_template_id_website_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `website_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `website_templates_status_idx` ON `website_templates` (`status`);--> statement-breakpoint
CREATE INDEX `website_templates_category_idx` ON `website_templates` (`category`);--> statement-breakpoint
INSERT INTO `website_templates` (`slug`, `name`, `category`, `description`, `version`, `status`, `tokens`, `tags`, `created_by`) VALUES (
	'esensi',
	'Esensi',
	'umum',
	'Tema bawaan platform yang dipakai tenant baru. Komposisi bersih dengan aksen biru, hero besar, dan kartu informasi yang mudah dipindai.',
	'1.0.0',
	'published',
	'{"primary":"#2563eb","secondary":"#1e40af","accent":"#f59e0b","background":"#f8fafc","surface":"#ffffff","text":"#0f172a","fontHeading":"serif","radius":"sedang","style":"terang"}',
	'["umum","pedesaan","layanan"]',
	NULL
);--> statement-breakpoint
INSERT INTO `website_template_versions` (`template_id`, `version`, `changelog`, `tokens`) VALUES (
	(SELECT `id` FROM `website_templates` WHERE `slug` = 'esensi'),
	'1.0.0',
	'Versi awal bawaan platform.',
	'{"primary":"#2563eb","secondary":"#1e40af","accent":"#f59e0b","background":"#f8fafc","surface":"#ffffff","text":"#0f172a","fontHeading":"serif","radius":"sedang","style":"terang"}'
);