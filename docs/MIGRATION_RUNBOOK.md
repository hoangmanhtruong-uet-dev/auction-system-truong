# Migration runbook

Scope: `20260721130000_auth_session_hardening` on MySQL 8.4. The migration is additive: four profile columns, one `auth_sessions` table, three indexes, and one foreign key. It performs no data backfill and creates no session for an existing user.

## Owner and approvals

- Release owner: application on-call.
- Database owner: infrastructure/database on-call.
- Security verification: security owner.
- Two-person approval is required for the production migration and abort/restore decision.

## Pre-check and abort conditions

1. Confirm the target host/database from the provider console; never infer it from a developer `.env`.
2. Confirm a restorable backup and record its provider identifier/checksum.
3. Confirm the previous image does not depend on removal of any new field (this change is additive).
4. Run `npx prisma validate --schema=app/prisma/schema.prisma` and `npx prisma migrate status --schema=app/prisma/schema.prisma` with a dedicated migration credential.
5. Inspect long transactions and metadata-lock waiters. Abort if a backup is not restorable, the migration history diverges, an unfinished Prisma migration exists, replication is unhealthy, or a long transaction can block the `profiles` metadata lock.

## Deploy

Quiesce account-administration writes if the provider dry-run shows a measurable metadata-lock wait. Run once from a controlled release job:

```bash
npx prisma migrate deploy --schema=app/prisma/schema.prisma
```

Do not run migration deployment from every web replica.

## Verification

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
WHERE migration_name = '20260721130000_auth_session_hardening';

SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'profiles'
  AND column_name IN ('failed_login_count','locked_until','last_login_at','must_change_password');

SHOW INDEX FROM auth_sessions;
SELECT constraint_name, referenced_table_name, delete_rule, update_rule
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE() AND table_name = 'auth_sessions';
SELECT COUNT(*) FROM auth_sessions WHERE token_hash IS NULL OR LENGTH(token_hash) <> 64;
```

Then run authentication/session smoke tests and verify login creates one hashed-token session.

## Lock, downtime, rollback

The new table/indexes do not scan existing rows. Adding four columns to `profiles` still requires a MySQL metadata lock; MySQL 8.4 may use an instant algorithm, but this repository does not claim a production lock duration without a production-sized staging measurement. The measured local dataset is too small to estimate downtime.

Application rollback is the first response: restore the prior image and retain the additive schema. Prisma migrations are forward-only. Before any new image has used the fields, a reviewed manual rollback is possible using the commented SQL in the migration; afterward prefer a forward-fix. Never drop `auth_sessions` while the new image receives traffic.

## Evidence (2026-07-21)

- Fresh MySQL 8.4.10 database: all 8 migrations applied successfully.
- Upgrade database: 7 previous migrations, representative data, then the target migration.
- Integrity: users 7→7; one each of auction, bid, notification, and audit log remained; all seven roles remained unchanged; sessions after migration = 0.
- Schema: expected defaults/nullability, unique token-hash index, status/last-seen indexes, and `profiles` FK with `ON DELETE/UPDATE CASCADE` verified.

