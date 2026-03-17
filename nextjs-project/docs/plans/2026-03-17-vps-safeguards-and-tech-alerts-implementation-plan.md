# VPS Safeguards & Tech Alerts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add VPS safety rails (bounded logs, cleanup, resource limits) and opt-in infrastructure alerts to technical admins via the existing Telegram bot.

**Architecture:** Docker Compose-level protections (logging rotation + resource limits) + host scheduled maintenance (cleanup + monitor). Infra alerts are ingested via a token-protected API route and delivered only to Admin users who explicitly enabled “tech alerts” and have Telegram linked.

**Tech Stack:** Docker Compose, Linux (cron/systemd timers), Next.js App Router, TypeScript, Prisma, PostgreSQL, Zod, Vitest.

---

### Task 1: Add opt-in flag to users (Prisma)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_infra_alerts_enabled_to_user/*`

**Step 1: Write failing test**

- Create: `src/services/user.service.infra-alerts.test.ts`
- Test desired behavior of a new selector function (see Task 2) to ensure only opt-in admins are selected.

**Step 2: Run test to verify it fails**

Run: `npm test src/services/user.service.infra-alerts.test.ts`  
Expected: FAIL because function/field doesn’t exist.

**Step 3: Update schema**

- Add `infraAlertsEnabled Boolean @default(false)` to `User`.

**Step 4: Create migration**

Run:
- `npx prisma format`
- `npx prisma migrate dev --name add_infra_alerts_enabled_to_user`

**Step 5: Re-run tests**

Run: `npm test src/services/user.service.infra-alerts.test.ts`  
Expected: still FAIL until Task 2 is implemented.

---

### Task 2: Recipient resolution for infra alerts (server-only)

**Files:**
- Modify: `src/services/user.service.ts`
- Create: `src/services/user.service.infra-alerts.test.ts` (from Task 1)

**Step 1: Write failing test**

Test cases:
- selects only users with `role=ADMIN`, `infraAlertsEnabled=true`, and non-null `telegramWhitelist.telegramUserId`
- does not select admins with `infraAlertsEnabled=false`

**Step 2: Run test to verify it fails**

Run: `npm test src/services/user.service.infra-alerts.test.ts`  
Expected: FAIL.

**Step 3: Minimal implementation**

Add server-only exported function:
- `getInfraAlertTelegramChatIds(): Promise<string[]>`

Implementation: Prisma query for users filtered by role + flag + join `telegramWhitelist`.

**Step 4: Re-run test**

Run: `npm test src/services/user.service.infra-alerts.test.ts`  
Expected: PASS.

---

### Task 3: Telegram notifier for infra alerts (separate channel)

**Files:**
- Modify: `src/lib/telegram-notify.ts`
- Create: `src/lib/telegram-notify.infra-alerts.test.ts`

**Step 1: Write failing test**

Test:
- when no recipients (empty list) -> does not call fetch
- when recipients exist -> calls Telegram sendMessage endpoint for each chat id

Notes:
- isolate network with `global.fetch` stub in Vitest
- do not test formatting too deeply; verify key parts are present

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/telegram-notify.infra-alerts.test.ts`  
Expected: FAIL.

**Step 3: Minimal implementation**

Add:
- `notifyTelegramInfraAlert(payload)` which:
  - reads bot token from settings
  - reads recipients via `getInfraAlertTelegramChatIds`
  - sends message(s) using existing `sendMessage` helper

**Step 4: Re-run test**

Run: `npm test src/lib/telegram-notify.infra-alerts.test.ts`  
Expected: PASS.

---

### Task 4: Token-protected API endpoint to ingest infra alerts

**Files:**
- Create: `src/app/api/admin/infra-alert/route.ts`
- Create: `src/app/api/admin/infra-alert/route.test.ts`

**Step 1: Write failing tests**

Test:
- returns 401 if token missing/invalid
- returns 400 if payload invalid (Zod)
- returns 200 and triggers notifier for valid token + payload

**Step 2: Run tests to verify they fail**

Run: `npm test src/app/api/admin/infra-alert/route.test.ts`  
Expected: FAIL.

**Step 3: Minimal implementation**

- Read shared secret from `process.env.INFRA_ALERT_TOKEN`
- Compare against `x-infra-alert-token` header
- Validate payload with Zod
- Call `notifyTelegramInfraAlert`

**Step 4: Re-run tests**

Run: `npm test src/app/api/admin/infra-alert/route.test.ts`  
Expected: PASS.

---

### Task 5: Admin UI toggle for “tech alerts” (opt-in)

**Files:**
- Modify: `src/app/admin/settings/page.tsx`
- Modify/Create API routes as needed:
  - Modify: `src/app/api/admin/settings/telegram/route.ts` (or create PATCH endpoint)
- Add Zod validation in the API route
- Create UI test only if existing project patterns cover it; otherwise rely on API tests.

**Steps:**
- Add a toggle per admin row (only if Telegram linked)
- Implement `PATCH` handler to update `User.infraAlertsEnabled` for a given userId
- Ensure only `ADMIN` can toggle flags (reuse existing admin guard)

Manual verification:
- login as admin
- go to `/admin/settings`
- toggle “Получать тех. оповещения”
- verify it persists after reload

---

### Task 6: Docker Compose protections (logs + resource limits)

**Files:**
- Modify: `docker-compose.yml`

**Steps:**
- Add `logging` with bounded rotation per service:
  - `driver: local`
  - `max-size: "10m"`
  - `max-file: "3"`
- Add CPU/memory limits per service appropriate for 2 vCPU / 4 GB RAM VPS.
- Add `pids` limit where safe (optional).

Manual verification on VPS:
- `docker compose up -d`
- `docker compose ps`
- `docker inspect <container>` to confirm logging driver and limits are applied.

---

### Task 7: Host-level safety rails (cleanup + monitor + scheduler)

**Files:**
- Create: `deploy/ops/docker-maintenance.sh`
- Create: `deploy/ops/vps-monitor.sh`
- Create: `deploy/ops/README.md`

**Steps:**
- Add cleanup script:
  - prune unused images/build cache with safe filters
  - log actions and keep logs bounded (or rely on syslog)
- Add monitor script:
  - disk usage thresholds: warn 80%, critical 90%
  - memory thresholds: warn 80%, critical 90%
  - simple dedupe window (avoid spamming)
  - call `/api/admin/infra-alert` with token
- Provide install instructions:
  - cron entries or systemd timer units (choose one, default cron)

---

### Task 8: “Last line of defense” (system-level limits)

**Files:**
- Docs only (first iteration): `deploy/ops/README.md`

**Steps:**
- Recommend enabling a small swap (if none) with sane swappiness
- Configure OOM/ulimits guidance (no changes unless explicitly requested)

---

### Final Verification

Run locally:
- `npm run lint`
- `npm test`
- `npm run build`

Run on VPS (manual):
- `./deploy/deploy.sh`
- generate synthetic alert (run monitor script once)
- confirm only opted-in admins receive Telegram alert

