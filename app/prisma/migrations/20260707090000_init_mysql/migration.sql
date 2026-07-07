-- CreateTable
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT true,
    `full_name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('USER', 'SELLER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `avatar_url` TEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `gender` VARCHAR(10) NULL,
    `birthday` DATE NULL,
    `bio` TEXT NULL,

    UNIQUE INDEX `profiles_email_key`(`email`),
    INDEX `idx_profiles_email`(`email`),
    INDEX `idx_profiles_role`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auctions` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `start_price` BIGINT NOT NULL,
    `current_price` BIGINT NOT NULL DEFAULT 0,
    `bid_step` BIGINT NOT NULL DEFAULT 10000,
    `category` VARCHAR(100) NULL,
    `condition` VARCHAR(100) NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 15,
    `auto_extension_enabled` BOOLEAN NOT NULL DEFAULT true,
    `max_extensions` INTEGER NOT NULL DEFAULT 3,
    `current_extension_count` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `seller_id` CHAR(36) NOT NULL,
    `winner_id` CHAR(36) NULL,
    `starts_at` DATETIME(6) NULL,
    `ends_at` DATETIME(6) NULL,
    `paid_at` DATETIME(6) NULL,
    `paid_by_id` CHAR(36) NULL,
    `canceled_at` DATETIME(6) NULL,
    `canceled_by_id` CHAR(36) NULL,
    `cancel_reason` TEXT NULL,
    `finished_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    INDEX `idx_auctions_status_ends_at`(`status`, `ends_at`),
    INDEX `idx_auctions_status_starts_at_ends_at`(`status`, `starts_at`, `ends_at`),
    INDEX `idx_auctions_seller_id_status`(`seller_id`, `status`),
    INDEX `idx_auctions_winner_id`(`winner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auction_images` (
    `id` CHAR(36) NOT NULL,
    `auction_id` CHAR(36) NOT NULL,
    `url` TEXT NOT NULL,
    `alt_text` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_auction_images_auction_id_sort_order`(`auction_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bids` (
    `id` CHAR(36) NOT NULL,
    `auction_id` CHAR(36) NOT NULL,
    `bidder_id` CHAR(36) NOT NULL,
    `amount` BIGINT NOT NULL,
    `is_auto_bid` BOOLEAN NOT NULL DEFAULT false,
    `auto_bid_max_price` BIGINT NULL,
    `status` ENUM('ACTIVE', 'WON', 'LOST', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    INDEX `idx_bids_auction_id_amount`(`auction_id`, `amount`),
    INDEX `idx_bids_auction_id_status_amount`(`auction_id`, `status`, `amount`),
    INDEX `idx_bids_bidder_id_created_at`(`bidder_id`, `created_at`),
    INDEX `idx_bids_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `watchlist` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `auction_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_watchlist_auction_id`(`auction_id`),
    UNIQUE INDEX `uq_watchlist_profile_id_auction_id`(`profile_id`, `auction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `auction_id` CHAR(36) NULL,
    `type` ENUM('AUCTION_CREATED', 'AUCTION_ACTIVATED', 'AUCTION_ENDING_SOON', 'AUCTION_ENDED', 'BID_PLACED', 'BID_OUTBID', 'BID_WON', 'BID_LOST', 'AUCTION_PAID', 'SYSTEM') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `metadata` JSON NULL,
    `read_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_notifications_profile_id_read_at_created_at`(`profile_id`, `read_at`, `created_at`),
    INDEX `idx_notifications_auction_id`(`auction_id`),
    INDEX `idx_notifications_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NULL,
    `action` ENUM('PROFILE_CREATED', 'PROFILE_UPDATED', 'AUCTION_CREATED', 'AUCTION_UPDATED', 'AUCTION_ACTIVATED', 'AUCTION_CANCELLED', 'AUCTION_COMPLETED', 'BID_PLACED', 'BID_CANCELLED', 'WATCHLIST_ADDED', 'WATCHLIST_REMOVED', 'NOTIFICATION_CREATED', 'ADMIN_ACTION') NOT NULL,
    `resource_type` VARCHAR(100) NOT NULL,
    `resource_id` CHAR(36) NOT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_audit_logs_profile_id`(`profile_id`),
    INDEX `idx_audit_logs_resource_type_resource_id`(`resource_type`, `resource_id`),
    INDEX `idx_audit_logs_created_at`(`created_at`),
    INDEX `idx_audit_logs_action`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verification_tokens` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    `used_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_email_verification_tokens_profile_id_used_at_expires_at`(`profile_id`, `used_at`, `expires_at`),
    INDEX `idx_email_verification_tokens_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `receive_email_marketing` BOOLEAN NOT NULL DEFAULT true,
    `receive_email_auction` BOOLEAN NOT NULL DEFAULT true,
    `receive_email_notification` BOOLEAN NOT NULL DEFAULT true,
    `dark_mode` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(10) NOT NULL DEFAULT 'vi-VN',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    INDEX `idx_user_preferences_profile_id`(`profile_id`),
    UNIQUE INDEX `uq_user_preferences_profile_id`(`profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auctions` ADD CONSTRAINT `auctions_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auctions` ADD CONSTRAINT `auctions_winner_id_fkey` FOREIGN KEY (`winner_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auction_images` ADD CONSTRAINT `auction_images_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bids` ADD CONSTRAINT `bids_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bids` ADD CONSTRAINT `bids_bidder_id_fkey` FOREIGN KEY (`bidder_id`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `watchlist` ADD CONSTRAINT `watchlist_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `watchlist` ADD CONSTRAINT `watchlist_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
