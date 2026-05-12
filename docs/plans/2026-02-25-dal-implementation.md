# Data Access Layer (DAL) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Isolate Prisma from UI and API routes; keep all DB operations in a dedicated Service Layer and prevent server-only code from being bundled on the client.

**Architecture:** Services in `src/services/` own all `prisma.*` calls. API routes in `src/app/api/` only parse HTTP (params/body), call service methods, and return HTTP responses. Lib utilities (`auth`, `cdek`, `password-reset`, etc.) do not use Prisma directly—they use services or pure helpers.

**Tech Stack:** Next.js 16, Prisma 7, TypeScript, `server-only` package.

---

## Current state (as of 2026-02-25)

- **Services:** `src/services/` has 13 service files; all have `import 'server-only'` at top. No `any` in services.
- **API routes:** All 44 route files use services (e.g. `productService`, `orderService`, `userService`); no direct `prisma` in `src/app/api/`.
- **Gaps:** `src/lib/cdek.ts` and `src/lib/password-reset.ts` still import `prisma` but do not use it (dead imports). Removing them completes “no Prisma in lib.”

---

## Task 1: Remove dead Prisma import from lib/cdek.ts

**Files:**
- Modify: `nextjs-project/src/lib/cdek.ts`

**Step 1:** Remove the unused import.

Delete line 13: `import { prisma } from '@/lib/prisma'`

**Step 2:** Verify.

Run: `cd nextjs-project && npm run build` (or `npx tsc --noEmit`).  
Expected: No errors; cdek.ts uses only dynamic imports of `@/services/order.service` and `@/services/settings.service` for DB.

**Step 3:** Commit.

```bash
git add nextjs-project/src/lib/cdek.ts
git commit -m "refactor(dal): remove unused prisma import from lib/cdek.ts"
```

---

## Task 2: Remove dead Prisma import from lib/password-reset.ts

**Files:**
- Modify: `nextjs-project/src/lib/password-reset.ts`

**Step 1:** Remove the unused import.

Delete line 3: `import { prisma } from '@/lib/prisma'`

**Step 2:** Verify.

Run: `cd nextjs-project && npx tsc --noEmit`.  
Expected: No errors.

**Step 3:** Commit.

```bash
git add nextjs-project/src/lib/password-reset.ts
git commit -m "refactor(dal): remove unused prisma import from lib/password-reset.ts"
```

---

## Task 3: Verify no Prisma in lib or API

**Step 1:** Grep for direct Prisma usage outside services.

```bash
cd nextjs-project
rg "from ['\"]@/lib/prisma['\"]|prisma\." --glob '!*.service.ts' src/lib src/app/api
```

Expected: No matches (or only type-only imports like `import type { Prisma } from '@prisma/client'` in API routes).

**Step 2:** If any file still uses `prisma` in lib or API, move that logic into the appropriate service and call the service from the route or lib.

---

## Optional follow-ups (Sprint 4 / later)

- **Explicit return types:** Add explicit return types to all service methods using Prisma-generated types (e.g. `Promise<Product | null>`, `Promise<Order[]>`). Current code relies on inference; no `any` in services.
- **Selective querying:** In services, use `select` to fetch only required fields (see [refactoring-cursor-sprints-archive.md](../refactoring-cursor-sprints-archive.md) Sprint 4).

---

## Execution handoff

Plan saved to `docs/plans/2026-02-25-dal-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** – One subagent per task, review between tasks.
2. **Parallel Session (separate)** – New session with executing-plans, batch execution with checkpoints.

Which approach?
