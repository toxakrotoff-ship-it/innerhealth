# Security Policy

## Reporting a vulnerability

**Do not** open public GitHub issues for security vulnerabilities.

Report security issues privately to:

```txt
toxa.krotoff@gmail.com
```

Include:

- A clear description of the issue and impact
- Steps to reproduce (or proof of concept)
- Affected areas (routes, APIs, integrations)
- Your environment (version, deployment type) if relevant

You may receive a follow-up if more detail is needed. There is no guaranteed response timeline.

## Scope of interest

Please report issues related to:

- **Authentication** — login, sessions, password reset, account takeover risks
- **2FA** — TOTP and email-based second factor bypass or misuse
- **Payment webhooks** — YooKassa (or other payment provider) signature validation, replay, or state manipulation
- **Delivery integrations** — CDEK or similar API credentials, webhook/callback handling, shipment data exposure
- **Admin access** — authorization, `ADMIN_SECRET_PATH`, privilege escalation, CSRF on sensitive admin actions
- **Secrets and environment handling** — leaked credentials in logs, client bundles, or repositories

## Out of scope (examples)

- Social engineering
- Denial-of-service without a clear, reproducible application flaw
- Issues in third-party services outside this codebase
- Missing security headers on static assets with no demonstrated exploit

## Safe disclosure

We appreciate responsible disclosure. Please allow reasonable time to investigate and address confirmed issues before public disclosure.

## Supported versions

Security fixes are prioritized on the default branch (`main`). Older tags or forks may not receive backports unless stated otherwise.
