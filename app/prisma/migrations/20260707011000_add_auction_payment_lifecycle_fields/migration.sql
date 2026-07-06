-- Add enum values used by the current Prisma schema.
ALTER TYPE "bid_status" ADD VALUE IF NOT EXISTS 'LOST';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'BID_LOST';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'AUCTION_PAID';

-- Add auction lifecycle/payment columns used by deployed code.
ALTER TABLE "auctions"
ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "paid_by_id" UUID,
ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "canceled_by_id" UUID,
ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT,
ADD COLUMN IF NOT EXISTS "finished_at" TIMESTAMPTZ(6);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_paid_by_id_fkey'
  ) THEN
    ALTER TABLE "auctions"
    ADD CONSTRAINT "auctions_paid_by_id_fkey"
    FOREIGN KEY ("paid_by_id") REFERENCES "profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_canceled_by_id_fkey'
  ) THEN
    ALTER TABLE "auctions"
    ADD CONSTRAINT "auctions_canceled_by_id_fkey"
    FOREIGN KEY ("canceled_by_id") REFERENCES "profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_auctions_status_starts_at_ends_at" ON "auctions"("status", "starts_at", "ends_at");
CREATE INDEX IF NOT EXISTS "idx_bids_auction_id_status_amount" ON "bids"("auction_id", "status", "amount");