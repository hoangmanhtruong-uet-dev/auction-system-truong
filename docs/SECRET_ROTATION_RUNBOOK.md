# Secret rotation runbook

Never paste old or new values into issues, logs, terminal reports, or this document.

## 2026-07-21 history scan result

A local, redacted heuristic scan of `git log --all -p` found four secret-like additions in historical `app/.env.example` and `app/README.md`: assigned bootstrap/secret values and credentialed MySQL/Redis-style URLs. The implicated historical commits are `525e9f52aece4714c5b977c2e3321e073d1af816` and `32d2ef0aaa4370a51095aa300af57a9bb44c1c26`. No `.env` file other than `.env.example` is tracked.

This is evidence requiring rotation, not proof that a value is currently active. A full Gitleaks scan was not completed locally because mounting private Git history into an untrusted third-party image was rejected by workstation policy.

## Mandatory rotation set

1. Bootstrap/admin password and every account that reused it.
2. MySQL application, migration, and backup credentials.
3. Redis ACL/password credentials.
4. JWT/session-signing and cron secrets.
5. Any CI/CD or scheduler copy derived from the historical values.

## Order and verification

1. Inventory references in the hosting secret store, MySQL users, Redis ACL users, CI/CD variables, cron scheduler, and approved local developer stores.
2. Create a unique replacement with least privilege; deploy dual credentials only where the provider requires a no-downtime transition.
3. Update web/workers, migration jobs, backup jobs, CI, and cron scheduler; restart and verify readiness/login/queue/cron smoke tests.
4. Revoke the old value at its source. Verify an isolated probe using the old credential is rejected; do not print the credential in the probe output.
5. Revoke all sessions after auth-secret or privileged-account rotation, review audit/security events, and record operator/time/change ticket.
6. Run an approved native or trusted-CI Gitleaks full-history scan with `--redact=100`.

Status: **P1 pending operator action**. Repository changes cannot prove hosting-side revocation.

History rewrite is optional after rotation and does not replace rotation. It requires operator approval, coordinated contributor re-clone/rebase instructions, protected-branch exception, and a separately approved force-push. This sprint does not rewrite or force-push history.

