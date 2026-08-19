# Production security verification report

Date: 2026-07-21. Decision: **NO-GO**.

## A. Baseline

| Gate | Result | Evidence |
| --- | --- | --- |
| Git status | DIRTY before sprint | 47 tracked files changed plus pre-existing untracked security/migration/infra work; no user change was reverted |
| `npm ci` | PASS | 727 packages installed; 0 vulnerability |
| Lint | PASS with debt | 0 errors, 42 warnings |
| Typecheck | PASS | `tsc --noEmit` |
| Unit tests | PASS | 45/45 final |
| Security tests | PASS | 14/14 final after origin/proxy/payment/alert additions |
| Integration tests | PASS | 9/9 final after Redis TTL/idempotency addition |
| Build | PASS | Next.js 16.2.9 production build final |
| Audit | PASS | 0 vulnerabilities |

## B. Test infrastructure

Docker Engine 29.4.2; MySQL Community 8.4.10 on loopback port 3307; Redis 7.4.9 on loopback port 6380. Both use disposable tmpfs volumes and test-only credentials from `docker-compose.integration.yml`. Database names end in `_test`; Redis DB 15 and a randomized queue prefix isolate integration tests.

## C. Migration verification

Fresh database: all 8 migrations PASS. Upgrade: 7 old migrations plus representative seven-role/user, auction, bid, notification, and audit data, then auth hardening PASS. Counts/roles unchanged, zero invalid sessions, expected columns/defaults/nullability/indexes/FK verified. No backfill exists. Metadata-lock duration was not measured against production-scale data; application rollback plus forward-fix is the default strategy. See `MIGRATION_RUNBOOK.md`.

## D. Authentication/session integration

Unit/security coverage passes token hashing, five-failure/15-minute lock policy, idle/absolute expiry, payload bounds, origin policy, and seed safety. Real MySQL/Redis dependency tests pass, but full request-context login/cookie/session/revoke/race scenarios were not implemented. **P1 FAIL/incomplete**.

## E. RBAC integration matrix

Permission unit matrix passes and server-side guards are inventoried in `RBAC_VERIFICATION.md`. Full anonymous/403/success/blocked/revoked/resource-scope/mass-assignment integration matrix and concurrent last-SUPER_ADMIN test are incomplete. **P1 FAIL/incomplete**.

## F. Auction concurrency

Real MySQL tests pass concurrent finalize serialization, unique outbox side effects, transaction rollback, and queue/outbox idempotency. Real Redis passes atomic Lua and NX reservation. Concurrent `placeBid` equal/different price, bid-vs-finalize, bid-vs-cancel, and retry replay were not exercised through the authenticated action. **P1 FAIL/incomplete**.

## G. Origin/proxy verification

Production requires exact `APP_ORIGIN`; no production fallback to public client URL. Lookalike/subdomain/scheme/port/malformed/missing-config cases pass. Proxy headers are ignored for provider `none`; trusted modes validate the selected header as an IP. The deployment-specific Nginx overwrite/network configuration is documented but not verified on a real host. **Code PASS; hosting P1**.

Production runtime header probe returned 200 with CSP excluding `unsafe-eval`, HSTS one year/includeSubDomains, nosniff, frame DENY, strict-origin referrer policy, restricted permissions policy, no `X-Powered-By`, and `Cache-Control: private, no-store, max-age=0` on `/auth/login`. The first runtime probe exposed a long-cache login-page bug; the route rules were corrected and the rebuilt runtime probe passed.

## H. Redis hardening

`rediss://`, username/password URL parsing, timeouts, finite reconnect attempts, and environment key prefixes are supported. Rate limiting/readiness fail closed in production; bid idempotency remains a MySQL invariant. Real TLS, ACL rejection, network isolation, memory policy, and provider monitoring are not verified. **P1**.

## I. Secret rotation

Local history heuristic found bootstrap/assigned-secret and credentialed-service-URL categories in two historical documentation/example files and two commits; values were not printed. Tracked non-example env count is zero. Rotation/revocation evidence is absent and full trusted Gitleaks scan is pending. **P1 blocker**.

## J. Backup restore rehearsal

PASS for a 29,303-byte synthetic logical backup: restore/integrity completed in 2.867 seconds, counts/roles/8 migrations/18 FKs matched, invalid bid links zero, resources cleaned. This is not production-scale RPO/RTO evidence. See `BACKUP_RESTORE_REHEARSAL.md`.

## K. Alerts

Configurable webhook adapter, severity, identifiers, environment, redaction, timeout, cooldown, and non-blocking failure behavior are implemented. Local receiver test PASS. No production destination/receipt exists. **P1**.

## L. CI gates

CI provisions MySQL 8.4 and Redis 7.4 and gates install, Prisma validate/generate/migrate/status, typecheck, lint, unit/security/integration, build, two audits, env-file rejection, Compose validation, and image builds. Full-history redacted Gitleaks gate was added. CI itself was not executed on GitHub in this sprint; historical findings may intentionally fail the new gate until triaged/rotated.

## M. Manual production configuration

| Work | Location/resource | Verification | Priority |
| --- | --- | --- | --- |
| Set exact origin and Nginx provider | Hosting env: `APP_ORIGIN`, `TRUSTED_PROXY_PROVIDER` | spoof/origin probes and readiness | P1 |
| Restrict web/DB/Redis network | firewall/private Compose network/Nginx | outside-port deny probes | P1 |
| Enable Redis TLS and ACL | provider Redis + `REDIS_URL` | TLS certificate and unauthorized ACL probes | P1 |
| Rotate historical credentials | hosting, DB, Redis, CI, cron, local stores | old credential rejected | P1 |
| Configure alert receiver | hosting secret store | synthetic event received/on-call routed | P1 |
| Measure provider backup RPO/RTO | managed backup/staging restore | provider backup restore record | P1 |
| Keep payments disabled | `REAL_MONEY_PAYMENTS_ENABLED=false` | readiness/config test | P0 if violated |

## N. Remaining blockers

- P0: none observed while real-money payments remain false.
- P1: full auth/session request integration; full RBAC/resource/race matrix; authenticated bid concurrency; credential rotation/full trusted scan; Nginx/network and Redis TLS/ACL verification; production alert receipt; provider-scale restore evidence.
- P2: 42 lint warnings; Prisma 7 config deprecation; production-sized metadata-lock timing.

## O. Conclusion

**NO-GO**. Fresh/upgrade migrations, real MySQL/Redis infrastructure tests, local backup restore, baseline quality gates, origin/proxy code, payment fail-closed guard, and local alert receiver provide meaningful evidence. The remaining P1 items include unrotated historical credential risk and missing auth/RBAC/bid integration/concurrency evidence, so the standard cannot be reduced to CONDITIONAL GO.
