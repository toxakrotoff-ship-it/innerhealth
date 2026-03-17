## Admin Statistics Dashboard & Yandex Metrika Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement an admin statistics dashboard as the main admin page (traffic, funnel, page behaviour) and add the ability to inject Yandex Metrika counters via admin settings.

**Architecture:** Use a hybrid analytics storage: a raw `AnalyticsEvent` log plus daily aggregate tables (`DailyTrafficStats`, `DailyFunnelStats`) updated by background jobs or admin-triggered aggregation. The admin dashboard reads mostly from aggregates for performance and falls back to raw events for detail. Yandex Metrika code is stored in settings and injected into the public site layout via server-side rendering.

**Tech Stack:** Next.js App Router, React (RSC + small client components), TypeScript, Prisma ORM, PostgreSQL (or current DB), Zod for validation, Tailwind/Shadcn UI for admin UI.

---

### Task 1: Extend Prisma schema with analytics and settings

**Files:**
- Modify: `nextjs-project/prisma/schema.prisma`

**Steps:**
1. Inspect existing models (especially any settings/site configuration models).
2. Add `AnalyticsEvent` model with fields: `id`, `occurredAt`, `userId?`, `sessionId?`, `anonId?`, `type` (enum), `path`, `pageTitle?`, `meta?` (Json), `ipHash?`, `userAgent?`.
3. Add `AnalyticsEventType` enum with values: `PAGE_VIEW`, `CLICK`, `CART_ADD`, `CHECKOUT_START`, `ORDER_CREATED`.
4. Add indexes on `occurredAt`, `(type, occurredAt)`, `(path, occurredAt)`, `(sessionId, occurredAt)`.
5. Add `DailyTrafficStats` model with `id`, `date`, `path?`, `pageViews`, `sessions`, `users?`, `clicks` and a unique constraint on `(date, path)`.
6. Add `DailyFunnelStats` model with `id`, `date`, `step` (enum), `count`, `conversionToNext?` and a unique constraint on `(date, step)`.
7. Add `FunnelStep` enum with values: `PAGE_VIEW`, `CART_ADD`, `CHECKOUT_START`, `ORDER_CREATED`.
8. Extend existing settings model (e.g. `Settings`/`SiteSettings`) with `yandexMetrikaHeadCode String?` and `yandexMetrikaBodyCode String?`.
9. Run `prisma format` to ensure the schema is valid.
10. Create and run a Prisma migration (`prisma migrate dev`) with a descriptive name like `add_analytics_and_metrika_settings`.

---

### Task 2: Implement server-side analytics event creation

**Files:**
- Create: `nextjs-project/src/lib/analytics/analytics-event-schema.ts`
- Create: `nextjs-project/src/lib/analytics/analytics-event-service.ts`
- Modify (if needed for prisma client): `nextjs-project/src/lib/prisma.ts`

**Steps:**
1. Define a Zod schema for incoming analytics events (`AnalyticsEventInput`) with fields: `type`, `path`, `occurredAt`, `sessionId?`, `anonId?`, `userId?`, `pageTitle?`, `meta?`.
2. Export a TypeScript `AnalyticsEventInput` type derived from the Zod schema.
3. Implement `createAnalyticsEvent(input: AnalyticsEventInput)` using Prisma, mapping fields to the `AnalyticsEvent` model and performing strict validation via Zod.
4. Implement `createAnalyticsEventsBatch(input: AnalyticsEventInput[])` that validates an array and performs a single `createMany` call for performance.
5. Ensure both functions are typed without `any` and return clear DTOs or Prisma types.
6. Add basic error logging with contextual information (type, path, sessionId) without logging raw PII.

---

### Task 3: Add public API endpoint for logging analytics events

**Files:**
- Create: `nextjs-project/src/app/api/analytics/events/route.ts`

**Steps:**
1. Implement a `POST` handler that accepts either a single event object or an array of events as JSON.
2. Parse and validate the payload using the Zod schema from `analytics-event-schema.ts`.
3. Apply simple rate limiting per IP/session (e.g. fixed window or token bucket using an in-memory or existing store) to avoid abuse.
4. Call `createAnalyticsEvent` or `createAnalyticsEventsBatch` accordingly.
5. Return structured JSON with success status and counts, along with appropriate error responses for validation or rate-limit failures.

---

### Task 4: Frontend utilities for sending analytics events

**Files:**
- Create: `nextjs-project/src/lib/analytics/analytics-client.ts`

**Steps:**
1. Implement a small client-side helper `logAnalyticsEvent(event: AnalyticsEventClientInput)` which POSTs to `/api/analytics/events`.
2. Define a lightweight `AnalyticsEventClientInput` type mirroring the server input but without server-only fields (e.g. no ipHash).
3. Optionally implement minimal batching/debouncing (queue events and send them on an interval or on `beforeunload`) for performance.
4. Handle failures quietly but log them in `console.debug` for debugging.

---

### Task 5: Instrument page views

**Files:**
- Modify: `nextjs-project/src/app/(site)/layout.tsx` (or main site layout)
- Create: `nextjs-project/src/components/analytics/page-view-tracker.tsx`

**Steps:**
1. Create a small client component `PageViewTracker` that uses Next.js router hooks to detect route changes.
2. On initial mount and on each route change, call `logAnalyticsEvent` with `type: 'PAGE_VIEW'`, the current `path`, `pageTitle`, and `sessionId/anonId` (from existing or new client-side session helper).
3. Ensure `PageViewTracker` is only included in public site layouts (not in admin) to avoid polluting data.
4. Add `PageViewTracker` to the top-level site layout JSX so that it is active on all public pages.

---

### Task 6: Instrument key clicks and order funnel events

**Files:**
- Modify: key site components such as:
  - `nextjs-project/src/components/site/cart-page-content.tsx`
  - Product cards/buttons components

**Steps:**
1. Identify key CTA elements: add-to-cart, start checkout, place order buttons, and other critical clicks.
2. Wrap or extend these buttons/links to call `logAnalyticsEvent` with `type: 'CLICK'` and `meta` containing context (e.g. productId, position, source component).
3. At the moment of adding an item to cart, send `CART_ADD` analytics event with appropriate context.
4. At the start of the checkout flow, send `CHECKOUT_START` event.
5. On successful order creation (server-confirmed), send `ORDER_CREATED` event with minimal context (e.g. orderId).
6. Verify in the database (via Prisma Studio or a temporary admin endpoint) that events are correctly created with expected fields and timestamps.

---

### Task 7: Implement aggregation services for daily stats

**Files:**
- Create: `nextjs-project/src/lib/analytics/aggregation-service.ts`

**Steps:**
1. Implement a function `aggregateTrafficForDate(date: Date)` that:
   - Queries `AnalyticsEvent` for that date range.
   - Computes totals per `path` (and overall) for `pageViews`, `sessions`, `users`, `clicks`.
   - Upserts results into `DailyTrafficStats` using the `(date, path)` unique key.
2. Implement `aggregateFunnelForDate(date: Date)` that:
   - Aggregates counts per `FunnelStep` from `AnalyticsEvent`.
   - Calculates `conversionToNext` where applicable.
   - Upserts results into `DailyFunnelStats` using the `(date, step)` unique key.
3. Implement wrapper helpers like `aggregateForDateRange(from: Date, to: Date)` that iterate per day.
4. Ensure all aggregations are idempotent (re-running for the same date overwrites old aggregates).

---

### Task 8: Expose aggregation via script or admin action

**Files:**
- Create: `nextjs-project/scripts/aggregate-analytics.ts` (Node script)
- Optionally create: `nextjs-project/src/app/api/admin/analytics/aggregate/route.ts`

**Steps:**
1. Implement a Node script that:
   - Accepts `from`/`to` dates via CLI args or defaults (e.g. yesterday).
   - Calls `aggregateForDateRange`.
   - Logs summary output to the console.
2. Optionally implement a protected admin API route that triggers aggregation for a given date range (for manual re-aggregation) and is available only to admin users.
3. Document how to run the script (e.g. `pnpm ts-node scripts/aggregate-analytics.ts --from=... --to=...`) and/or configure cron in the deployment environment.

---

### Task 9: Implement admin dashboard as main admin page

**Files:**
- Modify: `nextjs-project/src/app/admin/page.tsx`
- Modify: `nextjs-project/src/app/admin/layout.tsx` (if needed)
- Modify: `nextjs-project/src/app/admin/components/AdminNav.tsx`
- Create: `nextjs-project/src/app/admin/components/StatisticsDashboard.tsx`

**Steps:**
1. Update `admin/page.tsx` to render the statistics dashboard as the main content.
2. Accept `from`/`to` query parameters and default to "all time" when not present.
3. Implement server-side data fetching that:
   - Queries `DailyTrafficStats` and `DailyFunnelStats` filtered by the selected period.
   - Aggregates totals for KPI cards and prepares timeseries data for charts.
4. Implement `StatisticsDashboard` with:
   - A period filter (date range picker + presets: 7/30/90 days, all time).
   - Block A (traffic & engagement): KPI cards and a timeseries view.
   - Block B (order funnel): funnel visualization and key conversion metrics.
   - Block C (page behaviour): a table of top pages with views, clicks, CTR, and orders (if available).
5. Wire `AdminNav` so that the main "Главная/Статистика" link points to `/admin`.

---

### Task 10: Admin UI for Yandex Metrika counters

**Files:**
- Modify: `nextjs-project/src/app/admin/settings/page.tsx`
- Modify/Create: any settings-related API handler, e.g. `nextjs-project/src/app/api/admin/settings/route.ts`

**Steps:**
1. Extend the existing admin settings API DTO and Zod schema to include `yandexMetrikaHeadCode` and `yandexMetrikaBodyCode`.
2. In `admin/settings/page.tsx`, add a new section or tab "Аналитика / Счётчики".
3. Add two `textarea` fields for:
   - `yandexMetrikaHeadCode` (for script in `<head>`).
   - `yandexMetrikaBodyCode` (for `<noscript>` or tracking pixel in `<body>`).
4. Implement form submission that calls the settings API, with optimistic UI or success/error toasts.
5. Add reasonable validation (e.g. max length) and helper text explaining what code to paste.

---

### Task 11: Inject Yandex Metrika code into public layout

**Files:**
- Modify: `nextjs-project/src/app/(site)/layout.tsx`
- Modify (if needed): settings fetch helper, e.g. `nextjs-project/src/lib/settings.ts`

**Steps:**
1. Implement or reuse a server-side helper to fetch the current settings, including Metrika fields, with appropriate caching.
2. In the site layout, if `yandexMetrikaHeadCode` is present, inject it into `<head>` using `dangerouslySetInnerHTML`.
3. If `yandexMetrikaBodyCode` is present, render it at the top of `<body>` (e.g. inside a wrapper `div` with `dangerouslySetInnerHTML`).
4. Ensure this code is only included on the public site layout (not in admin) to avoid double-counting.
5. Manually verify in the browser devtools that the Yandex scripts are injected as expected both in dev and production.

---

### Task 12: Testing, performance checks, and documentation

**Files:**
- Add/modify: relevant tests under `nextjs-project/tests/` (or existing test structure)
- Modify: `nextjs-project/docs/plans/2026-03-16-admin-statistics-and-metrika.md` (this file) if any adjustments are needed

**Steps:**
1. Add tests for the analytics API route: valid payload, invalid payload, and rate-limit scenarios.
2. Add tests for aggregation functions to ensure they produce correct daily stats for known synthetic datasets.
3. Smoke-test the admin dashboard manually with seeded data to confirm correct totals, charts, and filters.
4. Perform a basic performance check by simulating many `AnalyticsEvent` rows and verifying that admin dashboard queries remain fast (thanks to aggregates and indexes).
5. Update this plan document if the implementation deviates in important ways, and keep a short "How to use" section for admins (where to see stats, where to paste Metrika code).

