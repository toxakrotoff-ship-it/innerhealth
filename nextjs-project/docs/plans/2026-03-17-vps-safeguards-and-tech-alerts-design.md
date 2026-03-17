## VPS Safeguards & Tech Alerts — Design

**Date:** 2026-03-17  
**Project:** Inner Health (Docker Compose on VPS: `app`, `db`, `nginx`, `telegram-bot`)

### Goal

- Prevent VPS resource exhaustion (disk, RAM, CPU) caused by:
  - unbounded container logs
  - unbounded container resource usage
  - Docker artifact accumulation (unused images/volumes)
- Add **infrastructure alerts** (disk/RAM/CPU/container health) delivered via the **existing Telegram bot**, to **opt-in** recipients (Admin users who explicitly enable “tech alerts” in admin UI).

### Non-goals

- Building a heavy monitoring stack (Prometheus/Grafana) in the first iteration.
- Replacing existing business notifications (orders/forms/reviews/payment errors).
- Implementing auto-remediation beyond safe actions (e.g. aggressive restarts) in the first iteration.

---

## Architecture Overview

### 1) Log growth control (containers)

**Primary approach:** configure log rotation per service in `docker-compose.yml` using Docker’s logging drivers and options.

- Recommended defaults:
  - `logging.driver`: `local` (or `json-file`)
  - `logging.options.max-size`: e.g. `10m`
  - `logging.options.max-file`: e.g. `3`

**Docs reference:**
- Docker logging driver `json-file` with rotation options (`max-size`, `max-file`).
- Docker logging driver `local` with rotation options.

---

### 2) Resource limits (containers)

**Primary approach:** define CPU/memory limits per service in Compose.

- Compose `deploy.resources.limits` / `deploy.resources.reservations` provides a clear declarative configuration for:
  - CPU (`cpus`)
  - memory (`memory`)
  - optionally `pids`

**Docs reference:**
- Compose file `deploy.resources` reference with `limits` and `reservations`.

**Caveat:** actual behavior depends on the runtime/Compose mode; implementation will verify which keys are applied by the current `docker compose` version used on VPS and adjust to a compatible configuration if needed.

---

### 3) Docker artifact cleanup (host)

Add a scheduled host task to prevent disk pressure from:
- dangling images
- build cache
- unused volumes/networks

**Strategy:**
- periodic `docker system prune` with safe flags and filters
- optionally a dedicated cleanup script under `nextjs-project/deploy/` invoked by `cron` or `systemd timer`

---

### 4) Infra monitoring + alert delivery (Telegram)

#### 4.1 Health checks + thresholds

Add a lightweight “monitor” (script + scheduler) that:
- checks:
  - disk usage (% + free bytes) for key mount points
  - RAM usage (incl. swap if enabled)
  - CPU load / saturation
  - container health (`docker compose ps`, healthchecks, restart loops)
- compares against configurable thresholds
- applies a simple deduplication window (e.g. do not spam the same alert more than once per N minutes)

#### 4.2 Delivery path

Send alerts through the existing Telegram bot infrastructure:
- Add a new “infra alert” notification function in `src/lib/telegram-notify.ts` (separate from orders/forms).
- Recipients are resolved from DB:
  - `User.role = ADMIN`
  - `User.infraAlertsEnabled = true` (**opt-in**)
  - must have `TelegramWhitelist` entry (`telegramUserId`)

#### 4.3 Admin UX: opt-in control

In Admin UI (`/admin/settings`), under “Telegram администраторов”:
- show a toggle “Получать тех. оповещения”
- toggle is enabled only if the user has Telegram linked

---

## Data Model Changes (Prisma)

### User

Add:
- `infraAlertsEnabled Boolean @default(false)` — only meaningful for `role = ADMIN`

No new roles are introduced (“tech admin” is a permission flag, not a role).

---

## API Design

### Internal alert ingestion endpoint

Add:
- `POST /api/admin/infra-alert`

Auth:
- requires a shared secret token (e.g. `INFRA_ALERT_TOKEN`) sent in an HTTP header.
- endpoint does **not** rely on NextAuth session (it’s called by the host monitor).

Validation:
- Zod schema for payload:
  - `kind` (disk|memory|cpu|container|custom)
  - `severity` (info|warn|critical)
  - `message` (string)
  - optional structured fields (service name, disk mount, percent, etc.)

Side effects:
- resolve recipients (tech-alert-enabled admins with Telegram linked)
- send message via the existing Telegram bot token configured in site settings

---

## Security Considerations

- Do not log the alert token or accept it via query string.
- Rate limit the ingestion endpoint (even though it’s token-protected) to avoid accidental loops.
- Deduplicate alert messages to avoid spamming and to reduce load.

---

## Verification / Success Criteria

- Container logs remain bounded (no uncontrolled growth in `/var/lib/docker/...`).
- On a simulated threshold breach (e.g. disk > 90%), Telegram alert is delivered only to:
  - admins who enabled “tech alerts”
  - and have Telegram linked
- Admin UI can toggle tech alerts without changing user role.
- Infra alert endpoint rejects requests without valid token.

---

## Implementation Notes (next step)

After approving this design, implementation will include:
- updates to `docker-compose.yml` (logging + resource limits)
- host scheduler files (cron/systemd timer) + cleanup/monitor scripts
- Prisma migration for `User.infraAlertsEnabled`
- admin UI toggle + API route to update this flag
- `/api/admin/infra-alert` endpoint + Telegram notifier function

