/*
  Warnings:

  - The values [AUCTION_UPDATED] on the enum `audit_logs_action` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `audit_logs` MODIFY `action` ENUM('PROFILE_CREATED', 'PROFILE_UPDATED', 'AUCTION_CREATED', 'AUCTION_ACTIVATED', 'AUCTION_CANCELLED', 'AUCTION_COMPLETED', 'BID_PLACED', 'BID_CANCELLED', 'WATCHLIST_ADDED', 'WATCHLIST_REMOVED', 'NOTIFICATION_CREATED', 'ADMIN_ACTION') NOT NULL;

-- CreateTable
CREATE TABLE `wallets` (
    `id` CHAR(36) NOT NULL,
    `profile_id` CHAR(36) NOT NULL,
    `balance` BIGINT NOT NULL DEFAULT 0,
    `total_frozen` BIGINT NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `wallets_profile_id_key`(`profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` CHAR(36) NOT NULL,
    `wallet_id` CHAR(36) NOT NULL,
    `type` ENUM('DEPOSIT', 'WITHDRAWAL', 'BID_FREEZE', 'BID_UNFREEZE', 'SETTLEMENT_DEBIT', 'PLATFORM_FEE', 'SELLER_PAYOUT', 'REFUND', 'PENALTY', 'ADMIN_ADJUSTMENT') NOT NULL,
    `amount` BIGINT NOT NULL,
    `balance_before` BIGINT NOT NULL,
    `balance_after` BIGINT NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` CHAR(36) NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_wallet_tx_wallet_id_created_at`(`wallet_id`, `created_at`),
    INDEX `idx_wallet_tx_reference`(`reference_type`, `reference_id`),
    INDEX `idx_wallet_tx_type`(`type`),
    INDEX `idx_wallet_tx_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `balance_freezes` (
    `id` CHAR(36) NOT NULL,
    `wallet_id` CHAR(36) NOT NULL,
    `auction_id` CHAR(36) NOT NULL,
    `bid_id` CHAR(36) NULL,
    `amount` BIGINT NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED', 'SETTLED', 'FORFEITED') NOT NULL DEFAULT 'ACTIVE',
    `reason` VARCHAR(100) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `released_at` DATETIME(6) NULL,

    INDEX `idx_balance_freeze_wallet_id_status`(`wallet_id`, `status`),
    INDEX `idx_balance_freeze_auction_id_status`(`auction_id`, `status`),
    INDEX `idx_balance_freeze_wallet_auction_status`(`wallet_id`, `auction_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_freezes` ADD CONSTRAINT `balance_freezes_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_freezes` ADD CONSTRAINT `balance_freezes_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_freezes` ADD CONSTRAINT `balance_freezes_bid_id_fkey` FOREIGN KEY (`bid_id`) REFERENCES `bids`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
