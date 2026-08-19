# Security alert destination

Set `SECURITY_ALERT_WEBHOOK_URL` and, when required, `SECURITY_ALERT_WEBHOOK_BEARER` only in the hosting secret store. Payloads include event, severity, environment, request/actor/resource identifiers when available, details, and timestamp. Keys matching password/token/cookie/authorization/secret/credential or service URLs are redacted before logging or delivery.

Routing covers login failures/lockout, rate-limit or Redis failure, invalid origin/cron auth, admin or super-admin role/block changes, mark-paid, and auction cancellation. Database/migration failure event types are available for release/health automation. Cooldown deduplicates the same event+actor+resource; timeout/failure is logged without failing an already committed application transaction.

The automated test starts a local HTTP receiver, verifies delivery, severity metadata, complete secret redaction, and cooldown. Production remains P1 until an operator sets a real endpoint, sends a synthetic event, confirms receipt/on-call routing, and records the alert-provider event ID without including its credential.

