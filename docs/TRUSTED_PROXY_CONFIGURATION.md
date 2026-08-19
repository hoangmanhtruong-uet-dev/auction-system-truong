# Trusted proxy configuration

Deployment target: the self-hosted Compose deployment behind a single operator-managed Nginx edge. The web container must not be published directly to the Internet once Nginx is attached.

## Required production environment

```text
APP_ORIGIN=https://auction.example.com
TRUSTED_PROXY_PROVIDER=nginx
```

Replace the origin with the exact public HTTPS scheme, host, and optional non-default port. Production does not fall back to `NEXT_PUBLIC_APP_URL`. Readiness fails when either variable is missing or invalid.

Nginx must overwrite (not append or preserve) client-supplied forwarding headers before proxying to the private web network:

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Host $host;
proxy_set_header X-Request-Id $request_id;
```

Only Nginx may reach the web container port. MySQL and Redis remain on an internal network with no public host port. Until those network controls are verified, set `TRUSTED_PROXY_PROVIDER=none`; the application then ignores all forwarded client-IP headers and rate limiting uses an untrusted/unknown IP bucket plus account keys.

## Fail-closed verification

1. Direct request with a forged `X-Forwarded-For` while provider is `none`: resolved IP is null.
2. Nginx mode accepts only the first syntactically valid IPv4/IPv6 address from the header Nginx overwrites; malformed values resolve to null.
3. Origin comparison uses URL origin equality. Lookalike domain, unapproved subdomain, HTTP downgrade, alternate port, malformed origin, and missing production `APP_ORIGIN` are rejected.
4. From outside the private network, connection to the web container, MySQL, and Redis ports must fail; only the HTTPS edge is reachable.
5. Generate five failed logins while changing client-supplied forwarding headers and confirm account/combo lockout is not bypassed.

Cloudflare or Vercel modes are not approved for this deployment. Changing provider requires documenting the edge header-stripping contract and rerunning spoofing tests.

