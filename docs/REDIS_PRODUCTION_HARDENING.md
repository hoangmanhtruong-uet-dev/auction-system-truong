# Redis production hardening

## Required infrastructure

- Use `rediss://` in `REDIS_URL` (or provider TLS with `REDIS_TLS_ENABLED=true`) and verify certificate validation from web and worker images.
- Create a dedicated ACL user for this environment; do not use `default` or share credentials with CI/staging.
- Permit network access only from web/workers and the approved operations runner. Do not publish Redis to the Internet.
- Set a unique `QUEUE_PREFIX` and `RATE_LIMIT_REDIS_PREFIX` per environment.
- Set provider max-memory and an eviction policy only after sizing. Queue/idempotency coordination keys must not be silently evicted; prefer `noeviction` for the shared critical instance or isolate caches from queues/limits.
- Monitor connection count, rejected connections, command errors, memory/evictions, latency, replication/persistence, and BullMQ lag/dead letters.
- Redis URLs/passwords are never logged. Connection/command timeouts and `REDIS_MAX_RECONNECT_ATTEMPTS` are finite.

## Failure decisions

| Capability | Source of truth | Production failure mode |
| --- | --- | --- |
| Login/account/bid rate limit | Redis Lua counter with TTL | Closed; request denied while Redis is unavailable |
| Account lock fields | MySQL profile fields | Closed through database/auth failure |
| Bid idempotency | MySQL unique key inside auction transaction | Closed; Redis is not trusted for this invariant |
| Auction/outbox publish | MySQL transactional outbox then Redis/BullMQ | Retry with bounded attempts; event remains pending/dead-letter, never silently dropped |
| Worker heartbeat/readiness | Redis | Closed; readiness fails |
| Telemetry/alert delivery | External destination | Non-blocking; main committed transaction remains successful |

`RATE_LIMIT_FAILURE_MODE=open` is ignored in production and exists only for explicit local development. Production verification must include ACL rejection for an unauthorized user, TLS protocol/certificate evidence, a network-deny probe, and a controlled Redis outage showing readiness and critical mutations fail closed. Those hosting checks remain P1 until performed against the selected provider.

