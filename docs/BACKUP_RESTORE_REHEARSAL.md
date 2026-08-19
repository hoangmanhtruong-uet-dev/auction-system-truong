# Backup and restore rehearsal

- Date: 2026-07-21
- Environment: disposable MySQL 8.4.10 container, test data only
- Source: `auction_upgrade_test`
- Restore target: `auction_upgrade_restore_test` (deleted after verification)
- Backup: logical `mysqldump`, single transaction, routines, triggers, no tablespaces, GTID purge disabled

## Commands (credentials omitted)

```bash
mysqldump --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF DB > backup.sql
sha256sum backup.sql
mysql RESTORE_DB < backup.sql
```

The real commands used only dedicated container-test credentials. The dump was 29,303 bytes. Its SHA-256 was recorded during the run and matched the file restored; the dump was then deleted.

## Integrity result

| Check | Source | Restored | Result |
| --- | ---: | ---: | --- |
| Profiles | 7 | 7 | PASS |
| Role distribution | 1 for each of 7 roles | same | PASS |
| Auctions | 1 | 1 | PASS |
| Bids | 1 | 1 | PASS |
| Notifications | 1 | 1 | PASS |
| Audit logs | 1 | 1 | PASS |
| Auth sessions | 0 | 0 | PASS |
| Finished migrations | 8 | 8 | PASS |
| Foreign keys | 18 | 18 | PASS |
| Invalid bid→auction/profile links | 0 | 0 | PASS |

Start: `2026-07-21T16:41:34.3599450Z`; end: `2026-07-21T16:41:37.2274243Z`; measured backup/create/restore/integrity duration: **2.867 seconds**. The restore database and temporary dump were removed.

RTO evidence is limited to this 29 KB synthetic dataset and cannot be extrapolated to production. RPO was not measured: this was an on-demand consistent snapshot, not a scheduled-backup lag test. Production RPO/RTO remain P1 until measured with provider backups and production-scale staging data.

