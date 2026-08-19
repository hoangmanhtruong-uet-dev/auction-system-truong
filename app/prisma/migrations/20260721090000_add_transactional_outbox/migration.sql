CREATE TABLE `outbox_events` (
  `id` CHAR(36) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `aggregate_type` VARCHAR(100) NOT NULL,
  `aggregate_id` CHAR(36) NOT NULL,
  `idempotency_key` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'DEAD_LETTER') NOT NULL DEFAULT 'PENDING',
  `attempt_count` INTEGER NOT NULL DEFAULT 0,
  `available_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `locked_at` DATETIME(6) NULL,
  `locked_by` VARCHAR(191) NULL,
  `processed_at` DATETIME(6) NULL,
  `last_error` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  UNIQUE INDEX `uq_outbox_events_idempotency_key` (`idempotency_key`),
  INDEX `idx_outbox_events_status_available_at` (`status`, `available_at`),
  INDEX `idx_outbox_events_status_locked_at` (`status`, `locked_at`),
  INDEX `idx_outbox_events_aggregate` (`aggregate_type`, `aggregate_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `notifications`
  ADD COLUMN `idempotency_key` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `uq_notifications_idempotency_key` (`idempotency_key`);
