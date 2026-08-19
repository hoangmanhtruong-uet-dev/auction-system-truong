# AutoBid security baseline

This document describes the security controls implemented in the auction application. The repository is not a karaoke/booking application: it has no booking, contact, upload, payment-provider webhook, or refund endpoint. Those controls are therefore marked out of scope rather than simulated.

## Audit summary

| Item | Baseline | Risk | Severity | Remediation |
| --- | --- | --- | --- | --- |
| Production seed | Fixed administrator email/password, reset on every seed, password printed | Complete privileged takeover | P0 | Production seed is fail-closed; development bootstrap requires explicit opt-in and injected unique credentials; existing users are never reset |
| Authentication token | JWT returned by the login/register Server Action | Token disclosure to browser code | P0 | Token is only stored in an HttpOnly cookie and never returned |
| Sessions | Seven-day JWT, version-only revocation, no idle timeout | Long-lived stolen session | P1 | Database-backed session record, SHA-256 token hash, 30-minute idle and 8-hour absolute timeout, per-session logout and revoke-all |
| Login abuse | Email-only Redis limit, no dummy hash or account lock | Enumeration and brute force | P1 | Generic response, dummy bcrypt, IP/account/combined Redis limits, five-failure 15-minute lock and structured security events |
| Privilege changes | Role/block did not revoke sessions; final super-admin could self-delete | Stale privilege and administrative lockout | P0/P1 | Session version increment/revocation and final-super-admin checks |
| Staff administration | List/block/role only | Unsafe manual credential workflow | P1 | Create/reset workflows generate one-time displayed temporary passwords, force first-login change, revoke sessions, and audit operations |
| Notification administration | `notifications.read.self` action returned all users' notifications | Broken access control/PII disclosure | P1 | New `notifications.read.all` permission restricted to ADMIN/SUPER_ADMIN |
| Bid idempotency | Schema column existed but action did not consume it | Duplicate bid side effects | P1 | Key is validated, checked after row lock, stored with the bid, and replay skips side effects |
| Cron mutation | GET changed auction state; normal string secret comparison; arbitrary proxy header trusted | CSRF/crawler mutation, timing and IP-spoof risks | P1 | POST-only, constant-time comparison, explicit trusted-proxy provider |
| Email verification | GET consumed token and token consumption was non-atomic | State-changing GET and replay race | P1 | Confirmation page invokes POST Server Action; atomic one-time consumption |
| Headers | CSP allowed `unsafe-eval` in production; no HSTS/no-store | XSS amplification and sensitive caching | P1 | Production removes `unsafe-eval`; HSTS, CSP, frame denial, nosniff, referrer/permissions policy, no-store, and hidden framework header |
| Audit values | No generic secret-field redaction | Credential leakage into audit storage | P1 | Recursive sensitive-key redaction and length limits |
| Public list limits | Client could request unbounded result counts | Resource exhaustion | P2 | Server clamps list reads to 1-100 rows |
| Real-money payment | No provider/webhook/double-entry ledger | Money loss if enabled | P0 blocker if enabled | `REAL_MONEY_PAYMENTS_ENABLED=false` is validated and documented; do not enable without a separate provider integration review |

## Session and authentication operations

- Apply migration `20260721130000_auth_session_hardening` before deploying the new image. It is additive. Existing JWTs intentionally become invalid because they have no server-side session record.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production. No broad cookie domain is configured.
- Password change, staff password reset, account block, role change, account deletion, and logout-all increment the session version or revoke matching session rows.
- Set `APP_ORIGIN` to the exact public origin. Set `TRUSTED_PROXY_PROVIDER` to `vercel`, `cloudflare`, or `nginx` only when that proxy strips client-supplied forwarding headers; otherwise use `none`.
- Redis is mandatory for production auth/bid limiting. Production failure mode is closed.

## Secret rotation

1. `JWT_SECRET`: deploy a new secret; expect all cookies to become invalid; verify login and session revocation.
2. `DATABASE_URL`: create a least-privilege application credential, deploy it to web/worker, verify readiness, then revoke the old credential. Migration/backup credentials must be separate.
3. `CRON_SECRET`: deploy the new value to both scheduler and application, verify one POST invocation, then remove the old value.
4. SMTP/API credentials: rotate at the provider, deploy through the hosting secret store, send one test notification, revoke old credentials. Never put them in `NEXT_PUBLIC_*` variables.
5. Redis credential: update Redis ACL/password, deploy web and worker together, verify rate limit and queue health, then revoke the old credential.

Do not paste old values into tickets, commits, logs, or incident reports. If a real secret was ever committed, rotate it even after removing it from the current tree and use an approved history-cleaning procedure.

Repository-history scanning found legacy fixed bootstrap-credential indicators in prior commits. Treat every credential used by that bootstrap path as compromised: rotate affected administrator credentials before production, review historical access, and decide with repository owners whether coordinated history rewriting is appropriate. The retired values are intentionally not reproduced here.

## Data retention and access

| Data | Default retention | Access/export/delete |
| --- | --- | --- |
| Auth sessions | Delete 30 days after expiry/revocation | Account owner revoke-all; ADMIN operational deletion job only |
| Login/security events | 90 days | Security/ADMIN only; no raw passwords/tokens/full request bodies |
| Audit logs and financial/auction history | 24 months, then archive according to legal policy | Read-only ADMIN/SUPER_ADMIN; export requires a future dedicated permission and audit event |
| Profiles and contact fields | Account lifetime plus 30-day recovery window | Self-service updates/deletion; privileged access via explicit permissions |
| Email verification tokens | Delete 30 days after use/expiry | System only; token stored as hash |
| Database backups | Daily, 35 days; monthly archive 12 months | Infrastructure operators only; encrypted at rest and in transit |

Retention jobs must log counts and identifiers, not deleted PII. Legal requirements override these defaults after review.

## Backup and restore

Use provider-managed encrypted backups plus a daily logical backup stored outside the primary database account/region where available. Target RPO is 24 hours and RTO is 4 hours until provider guarantees are documented. A backup is not considered working until restored into an isolated `_restore_test` database and row counts, foreign keys, migrations, auth, auction state, wallets and outbox are verified. Run a restore rehearsal quarterly and record evidence.

## Incident runbook

1. **Compromised administrator:** block the account, increment its session version/revoke sessions, preserve audit evidence, reset credentials, review role/payment/auction changes, and restore access through another SUPER_ADMIN.
2. **Leaked secret:** disable the affected integration, rotate using the order above, search logs/history without reproducing the value, redeploy, and verify old credentials fail.
3. **Unauthorized database access:** isolate web/workers, revoke DB credentials, preserve provider audit logs, restore/compare from a known backup, rotate every derived secret, and notify affected parties under applicable law.
4. **Bid spam:** keep Redis fail-closed, block abusive network sources at the edge, inspect security events and bid audit rows, and do not delete financial evidence.
5. **Forged payment/webhook:** real-money and provider webhook processing are not implemented; keep the feature flag false. If observed, disable workers and treat every claimed payment as untrusted.
6. **Failed deploy:** stop routing traffic to the new image, keep additive schema changes, restore the previous image, verify liveness/readiness, then forward-fix.
7. **Rollback:** application image first; migrations are forward-only. Do not drop the session table while new images run.
8. **Global session revoke:** increment `session_version` for affected profiles (or all profiles in a reviewed maintenance transaction), revoke active `auth_sessions`, rotate JWT secret for universal invalidation, and verify an old cookie gets 401.
9. **Lock all administrators:** set `deleted_at` and increment session versions in a reviewed transaction while preserving one offline recovery process; never remove the final recovery account without an approved bootstrap plan.
10. **Database restore:** restore to isolation, validate integrity/migrations and reconcile wallets/outbox with financial workers disabled before switching traffic.

After every incident, confirm old credentials/sessions fail, privileged routes return 401/403 correctly, Redis limits work, audit events are present, readiness is green, and production build/test evidence matches the deployed commit.

## Remaining infrastructure work

- Configure TLS/HSTS at the edge, trusted proxy behavior, Redis ACL/TLS, database network isolation, encrypted backups, alert delivery, log retention, and quarterly restore exercises.
- Integrate a real alert destination (Sentry/SIEM/email) behind the structured security-event abstraction.
- A real payment provider requires signed raw-body webhooks, timestamp/replay protection, provider event IDs, an explicit state machine, reconciliation, refund permission/re-authentication, and integration tests before the real-money flag may change.
