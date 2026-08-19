# RBAC inventory and verification matrix

Legend: `Y` has the base permission; `-` does not. Every action additionally rejects anonymous, blocked, must-change-password (except password change), or revoked-session callers. Ownership/rank/state constraints still apply.

| Endpoint/action | USER | SELLER | SUPPORT | MODERATOR | FINANCE | ADMIN | SUPER_ADMIN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/admin/**` shell (`admin.area.access`) | - | - | - | - | - | Y | Y |
| List all bids | - | - | Y | Y | Y | Y | Y |
| List payments | - | - | - | - | Y | Y | Y |
| List audit logs | - | - | Y | Y | Y | Y | Y |
| List all notifications | - | - | - | - | - | Y | Y |
| List users | - | - | Y | Y | Y | Y | Y |
| Block user | - | - | - | Y | - | Y | Y |
| Create/reset staff, change role | - | - | - | - | - | Y | Y |
| Cancel any auction / finalize | - | - | - | Y | - | Y | Y |
| Manual mark-paid | - | - | - | - | Y | Y | Y |
| Create auction | - | Y | - | - | - | - | - |
| Place bid | Y | Y | - | - | - | - | - |
| Read/manage own notifications | Y | Y | - | - | - | - | - |
| `GET /api/auctions/[id]/stream` | Y | Y | Y | Y | Y | Y | Y |
| `POST /api/auctions/finalize` | cron secret only | cron secret only | cron secret only | cron secret only | cron secret only | cron secret only | cron secret only |

`SUPPORT` does not have `notifications.read.all`; `MODERATOR` has no finance permission; `FINANCE` has no role-update permission. Admin role/block/reset flows reject self-management and rank violations. Last-active-SUPER_ADMIN block/demotion checks run in serializable transactions.

Automated RBAC unit matrix passes for permission assignment and peer/rank rules. Server actions perform permission checks on entry, so direct invocation cannot rely on UI hiding. However, the sprint did not complete a request-level integration matrix for every row, resource-scope/mass-assignment probes, or the two-request race against the last SUPER_ADMIN. Those remain **P1** and prevent GO.

