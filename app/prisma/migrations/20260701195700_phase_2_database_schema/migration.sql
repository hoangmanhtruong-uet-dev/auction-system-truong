-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "auction_status" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "bid_status" AS ENUM ('ACTIVE', 'WON', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('AUCTION_CREATED', 'AUCTION_ACTIVATED', 'AUCTION_ENDING_SOON', 'AUCTION_ENDED', 'BID_PLACED', 'BID_OUTBID', 'BID_WON', 'SYSTEM');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('PROFILE_CREATED', 'PROFILE_UPDATED', 'AUCTION_CREATED', 'AUCTION_UPDATED', 'AUCTION_ACTIVATED', 'AUCTION_CANCELLED', 'AUCTION_COMPLETED', 'BID_PLACED', 'BID_CANCELLED', 'WATCHLIST_ADDED', 'WATCHLIST_REMOVED', 'NOTIFICATION_CREATED', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "start_price" BIGINT NOT NULL,
    "current_price" BIGINT NOT NULL DEFAULT 0,
    "bid_step" BIGINT NOT NULL DEFAULT 10000,
    "duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "auto_extension_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_extensions" INTEGER NOT NULL DEFAULT 3,
    "current_extension_count" INTEGER NOT NULL DEFAULT 0,
    "status" "auction_status" NOT NULL DEFAULT 'PENDING',
    "seller_id" UUID NOT NULL,
    "winner_id" UUID,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_images" (
    "id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "is_auto_bid" BOOLEAN NOT NULL DEFAULT false,
    "auto_bid_max_price" BIGINT,
    "status" "bid_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "auction_id" UUID,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "profile_id" UUID,
    "action" "audit_action" NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "idx_profiles_email" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "idx_profiles_role" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "idx_auctions_status_ends_at" ON "auctions"("status", "ends_at");

-- CreateIndex
CREATE INDEX "idx_auctions_seller_id_status" ON "auctions"("seller_id", "status");

-- CreateIndex
CREATE INDEX "idx_auctions_winner_id" ON "auctions"("winner_id");

-- CreateIndex
CREATE INDEX "idx_auction_images_auction_id_sort_order" ON "auction_images"("auction_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_bids_auction_id_amount" ON "bids"("auction_id", "amount");

-- CreateIndex
CREATE INDEX "idx_bids_bidder_id_created_at" ON "bids"("bidder_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_bids_status" ON "bids"("status");

-- CreateIndex
CREATE INDEX "idx_watchlist_auction_id" ON "watchlist"("auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_watchlist_profile_id_auction_id" ON "watchlist"("profile_id", "auction_id");

-- CreateIndex
CREATE INDEX "idx_notifications_profile_id_read_at_created_at" ON "notifications"("profile_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_auction_id" ON "notifications"("auction_id");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_audit_logs_profile_id" ON "audit_logs"("profile_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_resource_type_resource_id" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_images" ADD CONSTRAINT "auction_images_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

