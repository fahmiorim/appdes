-- AUD-035: tegakkan kepemilikan tenant pada `users.role_id` di database.
--
-- `roles.village_id` NULL berarti role platform; selain itu role milik desa.
-- Composite FK tidak bisa dipakai di sini: kunci tenant yang diturunkan dari
-- `village_id` (kolom yang sudah menjadi bagian FK lain) ditolak MySQL dengan
-- `ER_CANT_CREATE_TABLE`/1215, sedangkan FK pada generated column juga tidak
-- boleh memakai `ON DELETE SET NULL`. Trigger menjaga invariant yang sama:
-- akun desa hanya boleh memakai role desanya, akun platform hanya role
-- platform, dan role yang sudah dipakai tidak bisa dipindah tenant.
--
-- Guard berjalan lebih dulu dan menghentikan migration (duplicate-key error)
-- bila data lama sudah melanggar aturan baru. Tidak ada baris domain yang
-- diubah oleh migration ini.

DROP TABLE IF EXISTS _rct_tenant_preflight_abort;
--> statement-breakpoint
DROP TABLE IF EXISTS _rct_tenant_preflight_findings;
--> statement-breakpoint
CREATE TABLE _rct_tenant_preflight_findings (
  relasi varchar(100) NOT NULL,
  jenis varchar(32) NOT NULL,
  jumlah bigint NOT NULL,
  kode_pesan varchar(72) NOT NULL,
  PRIMARY KEY (relasi, jenis)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO _rct_tenant_preflight_findings (relasi, jenis, jumlah, kode_pesan)
SELECT relasi, jenis, jumlah, kode_pesan
FROM (
  SELECT 'users.role_id' relasi, 'desa-role-platform' jenis, COUNT(*) jumlah,
         'RCT akun desa memakai role platform' kode_pesan
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.village_id IS NOT NULL AND r.village_id IS NULL
  UNION ALL
  SELECT 'users.role_id', 'platform-role-desa', COUNT(*),
         'RCT akun platform memakai role desa'
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.village_id IS NULL AND r.village_id IS NOT NULL
) AS temuan
WHERE jumlah > 0;
--> statement-breakpoint
CREATE TABLE _rct_tenant_preflight_abort (
  pesan varchar(72) NOT NULL,
  PRIMARY KEY (pesan)
) ENGINE=InnoDB;
--> statement-breakpoint
-- Duplicate-key error stops the migration while preserving findings above.
INSERT INTO _rct_tenant_preflight_abort (pesan)
SELECT CONCAT(kode_pesan, ' (', jenis, '=', jumlah, ')') FROM _rct_tenant_preflight_findings;
--> statement-breakpoint
INSERT INTO _rct_tenant_preflight_abort (pesan)
SELECT CONCAT(kode_pesan, ' (', jenis, '=', jumlah, ')') FROM _rct_tenant_preflight_findings;
--> statement-breakpoint
DROP TABLE IF EXISTS _rct_tenant_preflight_abort;
--> statement-breakpoint
DROP TRIGGER IF EXISTS users_role_tenant_bi;
--> statement-breakpoint
DROP TRIGGER IF EXISTS users_role_tenant_bu;
--> statement-breakpoint
DROP TRIGGER IF EXISTS roles_tenant_village_bu;
--> statement-breakpoint
CREATE TRIGGER users_role_tenant_bi BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  DECLARE role_village INT DEFAULT NULL;
  IF NEW.role_id IS NOT NULL THEN
    SELECT village_id INTO role_village FROM roles WHERE id = NEW.role_id;
    IF (NEW.village_id IS NULL AND role_village IS NOT NULL)
       OR (NEW.village_id IS NOT NULL
           AND (role_village IS NULL OR role_village <> NEW.village_id)) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role tidak sesuai tenant akun.';
    END IF;
  END IF;
END;
--> statement-breakpoint
CREATE TRIGGER users_role_tenant_bu BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  DECLARE role_village INT DEFAULT NULL;
  IF NEW.role_id IS NOT NULL THEN
    SELECT village_id INTO role_village FROM roles WHERE id = NEW.role_id;
    IF (NEW.village_id IS NULL AND role_village IS NOT NULL)
       OR (NEW.village_id IS NOT NULL
           AND (role_village IS NULL OR role_village <> NEW.village_id)) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role tidak sesuai tenant akun.';
    END IF;
  END IF;
END;
--> statement-breakpoint
CREATE TRIGGER roles_tenant_village_bu BEFORE UPDATE ON roles
FOR EACH ROW
BEGIN
  IF NOT (NEW.village_id <=> OLD.village_id)
     AND EXISTS (SELECT 1 FROM users WHERE role_id = OLD.id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role yang dipakai tidak dapat dipindah tenant.';
  END IF;
END;
