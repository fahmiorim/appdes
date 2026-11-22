ALTER TABLE `role_permissions`
  ADD COLUMN `can_read` boolean NOT NULL DEFAULT false,
  ADD COLUMN `can_create` boolean NOT NULL DEFAULT false,
  ADD COLUMN `can_update` boolean NOT NULL DEFAULT false,
  ADD COLUMN `can_delete` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE `role_permissions`
SET
  `can_read` = CASE WHEN `access` IN ('read','write','manage') THEN true ELSE false END,
  `can_create` = CASE WHEN `access` IN ('write','manage') THEN true ELSE false END,
  `can_update` = CASE WHEN `access` IN ('write','manage') THEN true ELSE false END,
  `can_delete` = CASE WHEN `access` = 'manage' THEN true ELSE false END;
