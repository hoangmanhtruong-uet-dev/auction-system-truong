ALTER TABLE `bids`
  ADD COLUMN `idempotency_key` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `uq_bids_idempotency_key` (`idempotency_key`);
