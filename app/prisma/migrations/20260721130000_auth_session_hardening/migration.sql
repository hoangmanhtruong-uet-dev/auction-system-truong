ALTER TABLE `profiles`
  ADD COLUMN `failed_login_count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `locked_until` DATETIME(6) NULL,
  ADD COLUMN `last_login_at` DATETIME(6) NULL,
  ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `auth_sessions` (
  `id` CHAR(36) NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `session_version` INTEGER NOT NULL,
  `last_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6) NOT NULL,
  `revoked_at` DATETIME(6) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(512) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX `auth_sessions_token_hash_key` (`token_hash`),
  INDEX `idx_auth_sessions_profile_status` (`profile_id`, `revoked_at`, `expires_at`),
  INDEX `idx_auth_sessions_last_seen` (`last_seen_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `auth_sessions_profile_id_fkey`
    FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Rollback (only before deploying code that depends on these fields):
-- DROP TABLE `auth_sessions`;
-- ALTER TABLE `profiles` DROP COLUMN `must_change_password`, DROP COLUMN `last_login_at`,
--   DROP COLUMN `locked_until`, DROP COLUMN `failed_login_count`;
