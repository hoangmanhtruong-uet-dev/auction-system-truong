# Real-money payment enablement gate

`REAL_MONEY_PAYMENTS_ENABLED` is absent-or-false by default. `assertRealMoneyPaymentsEnabled()` is the central server guard for any future provider path. Clients cannot change process environment. Manual `mark paid` remains an audited administrative state transition; it is not evidence of provider payment and must not be exposed as a webhook.

Do not set the flag true until all of the following are implemented and independently reviewed: contracted provider and sandbox, raw-body webhook signature verification, timestamp tolerance, replay prevention, provider event idempotency, explicit payment state machine, double-entry ledger, refunds/disputes, reconciliation, audit and security alert routing, least-privilege permissions with re-authentication, sandbox integration/E2E/concurrency tests, and operational rollback/incident runbooks.

There is currently no provider webhook route. Real-money enablement remains prohibited.
