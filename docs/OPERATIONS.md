# AutoBid staging operations

## Deployment

1. Run CI gates and build the `web` and `worker` Docker targets.
2. Run `npx prisma migrate status --schema=app/prisma/schema.prisma` against the target database.
3. Apply migrations once from a controlled release job with `npx prisma migrate deploy --schema=app/prisma/schema.prisma`. Do not run migrations from every replica.
4. Deploy worker with `FINANCIAL_OPERATIONS_ENABLED=false` and confirm its Redis heartbeat.
5. Deploy web and verify `/api/health/live` and `/api/health/ready` before routing traffic.

## Rollback

Roll back application images first. Prisma migrations are forward-only; do not edit or automatically reverse deployed migrations. For a schema incompatibility, stop traffic and workers, restore the compatible application image, then follow a reviewed forward-fix migration.

## Redis outage

Web readiness returns 503 and queue producers fail closed. Do not bypass Redis-backed bid rate limiting. Restore Redis, verify `PING`, queue counts and worker heartbeat, then restore traffic. Redis is not the financial source of truth; MySQL is.

## Database outage

Web and worker readiness must fail. Stop workers to avoid retry storms, restore database connectivity, confirm `prisma migrate status`, then restart the worker before web traffic.

## Backup and restore

MySQL is the source of truth. Use provider-managed encrypted backups plus daily logical backups. Initial staging targets are RPO 24 hours and RTO 4 hours until the hosting provider supplies stronger guarantees. Redis AOF improves queue recovery but is not a substitute for database backup.

Restore rehearsal:

1. Restore the latest backup into an isolated staging database.
2. Run migration status without applying destructive changes.
3. Validate row counts for profiles, auctions, bids, wallets, freezes and wallet transactions.
4. Keep financial workers disabled while inspecting delayed and failed BullMQ jobs.
5. Reconcile auction status, freezes and transactions before enabling non-financial workers.
6. A finance owner must approve any settlement replay manually. Never bulk replay settlement jobs after a restore.

### Logical backup rehearsal

Use a dedicated test database ending in `_test`; never rehearse against development or production. Do not put passwords on the command line (use a protected MySQL option file or provider secret injection).

1. Seed representative profiles, auctions, bids, wallets, outbox rows and notifications.
2. Run `mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF <database> > backup.sql`.
3. Create a new empty restore database ending in `_restore_test`.
4. Restore with `mysql <restore_database> < backup.sql`.
5. Compare row counts for every source-of-truth table, verify foreign keys and unique indexes, and run `prisma migrate status` against the restored URL.
6. Start one worker and one web instance against the restored database with financial and real-money flags false; verify liveness, readiness, heartbeat and one non-financial queue job.
7. Destroy the isolated restore database and securely delete the temporary dump according to the provider retention policy.

Record backup identifier, start/end time, row-count evidence, RPO/RTO achieved and operator approval. A local script alone is not production evidence.

## Transactional outbox operations

Auction close writes `AUCTION_CLOSED`, `SETTLEMENT_REQUESTED` and notification requests in the same MySQL transaction as the state transition. The dispatcher claims rows using a conditional lease, recovers stale `PROCESSING` rows, publishes deterministic BullMQ job IDs, and only then marks rows `PROCESSED`.

Alert when pending age exceeds 60 seconds, `DEAD_LETTER` count is non-zero, a lease remains held longer than `OUTBOX_LOCK_TIMEOUT_MS`, or dispatcher attempts increase rapidly. Do not manually mark an event processed. After fixing the dependency or poison payload, use a reviewed operator command to reset only explicitly selected dead-letter IDs to `PENDING`; preserve `attempt_count` and the prior error in the incident record.

## Monitoring and incident recovery

At minimum, export and alert on web readiness failures, database/Redis latency, worker heartbeat age, BullMQ waiting/active/failed/delayed counts, outbox pending age/dead letters, job retry rate, auction duplicate-transition count and shutdown timeouts. Page on worker heartbeat stale or queue lag above the agreed staging SLO. Financial queues remain disabled and must not be bulk-replayed.

For a release rollback, roll back images first. For additive migrations, keep the expanded schema and forward-fix. Destructive changes require an expand-and-contract release sequence; never drop a column/table while an old image can still access it.

## Staging load test

The k6 smoke profile is in `load/k6-staging.js`. Proposed initial assumptions (not capacity commitments): readiness p95 below 250 ms, auction read p95 below 750 ms, error rate below 1%, and no duplicate auction transition. A bid load profile remains blocked until the application exposes a supported HTTP test surface or a k6-compatible authenticated endpoint; do not add a production-only bypass for load testing.

## Real-money safety

This repository is not approved for real-money payments. There is no production payment provider/webhook verification or complete double-entry ledger. `REAL_MONEY_PAYMENTS_ENABLED` is restricted to `false`; settlement workers are not created unless the separate internal financial flag is explicitly enabled.

Before enabling internal settlement, replace the current queue enqueue inside the auction-closing database transaction with a transactional outbox (including a unique event/idempotency key). Until that boundary exists and concurrent expiry/retry tests pass against real MySQL and Redis, an auction commit can become separated from its settlement job and financial operations must remain disabled.
