-- 1. Partial unique index: chỉ 1 ACTIVE bid / auction
CREATE UNIQUE INDEX uq_bids_active_auction
ON bids (auction_id) WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- 2. Idempotency key column cho bids
ALTER TABLE bids ADD COLUMN idempotency_key VARCHAR(64) DEFAULT NULL;

-- 3. Unique constraint kết hợp (auctionId, bidderId, idempotencyKey)
CREATE UNIQUE INDEX uq_bids_idempotency
ON bids (auction_id, bidder_id, idempotency_key);