# LK Users A-G Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement customer account capabilities from `docs/LK-users.md` for tasks `A -> G` with secure auth, verified-email gates, account pages, saved addresses in cart, and SDEK tracking visibility.

**Architecture:** Use a vertical sequence: schema -> services/validation -> API -> auth/verification -> LK UI -> cart integration -> tracking UI. Keep API routes thin, move business logic into services, and enforce ownership (`session.user.id`) plus unverified-user restrictions in one reusable guard.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7/Postgres, NextAuth, Zod, Tailwind/shadcn.

---

## Execution Rules

- Follow `@superpowers:test-driven-development` for each behavior change.
- After each task, run focused verification (`lint` + targeted smoke).
- Keep commits small and task-scoped.
- Do not mix migration changes with unrelated UI refactors.

### Task 1: Prisma models and migration (A)

**Files:**
- Modify: `nextjs-project/prisma/schema.prisma`
- Create: `nextjs-project/prisma/migrations/<timestamp>_add-lk-users-models/migration.sql` (generated)

**Step 1: Add failing schema assertions (manual checklist)**

Create checklist in local notes:
- `User` has `orders`, `addresses`, `emailVerificationTokens`, `emailVerifiedAt`
- `Order` has relation to `User` and `cdekTrackNumber`
- `UserAddress` and `EmailVerificationToken` models exist

**Step 2: Run schema validation before edits**

Run: `cd nextjs-project && npx prisma validate`  
Expected: PASS for current schema.

**Step 3: Implement minimal schema updates**

Add only fields/relations required by Task A:
- `User <-> Order` relation
- `UserAddress`
- `Order.cdekTrackNumber`
- `User.emailVerifiedAt`
- `EmailVerificationToken`
- required indexes

**Step 4: Generate migration**

Run: `cd nextjs-project && npx prisma migrate dev --name add-lk-users-models`  
Expected: migration created and applied locally.

**Step 5: Verify generated client**

Run: `cd nextjs-project && npx prisma generate`  
Expected: Prisma Client generated without errors.

**Step 6: Commit**

```bash
cd nextjs-project
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add lk user account schema foundation"
```

### Task 2: Address and account service layer (B)

**Files:**
- Create: `nextjs-project/src/services/user-address.service.ts`
- Create: `nextjs-project/src/services/account.service.ts`
- Modify: `nextjs-project/src/services/user.service.ts` (only if small selectors/helpers are needed)

**Step 1: Write failing service-level behavior checks**

Create lightweight checks (script or temporary test harness) for:
- create address blocks when user already has 3
- update/delete fail on foreign address
- order detail query requires `(id, userId)`

**Step 2: Run checks and confirm failures**

Run: `cd nextjs-project && npm run lint`  
Expected: no pre-existing issues from new files yet; behavior checks fail by "not implemented".

**Step 3: Implement minimal service methods**

`user-address.service.ts`:
- `listUserAddresses`
- `createUserAddress` (count guard)
- `updateUserAddress` (ownership)
- `deleteUserAddress` (ownership)

`account.service.ts`:
- `getAccountDashboard`
- `getUserOrders`
- `getUserOrderById`

**Step 4: Re-run checks**

Run: `cd nextjs-project && npm run lint`  
Expected: lint passes for new service code.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/services/user-address.service.ts src/services/account.service.ts src/services/user.service.ts
git commit -m "feat: add account and address service layer"
```

### Task 3: Zod schemas for account/address boundaries (B)

**Files:**
- Create: `nextjs-project/src/lib/validations/user-address.ts`
- Create: `nextjs-project/src/lib/validations/account.ts`

**Step 1: Write failing validation examples**

Add examples for:
- PVZ without `cdekPvzCode` -> fail
- Door without `street`/`house` -> fail
- missing `cdekCityCode`/`city` -> fail

**Step 2: Verify examples fail initially**

Run lint/type check of scaffolding.  
Expected: boundary examples fail before schema implementation.

**Step 3: Implement minimal Zod schemas with refinements**

Implement create/update schemas and pagination/token payload schemas.

**Step 4: Verify examples pass/fail as expected**

Run: `cd nextjs-project && npm run lint`  
Expected: validations compile; invalid examples rejected.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/lib/validations/user-address.ts src/lib/validations/account.ts
git commit -m "feat: add zod validations for account and addresses"
```

### Task 4: Account API endpoints as thin wrappers (C)

**Files:**
- Create: `nextjs-project/src/app/api/account/dashboard/route.ts`
- Create: `nextjs-project/src/app/api/account/orders/route.ts`
- Create: `nextjs-project/src/app/api/account/orders/[id]/route.ts`
- Create: `nextjs-project/src/app/api/account/addresses/route.ts`
- Create: `nextjs-project/src/app/api/account/addresses/[id]/route.ts`
- Create: `nextjs-project/src/lib/auth/require-user-session.ts`

**Step 1: Add failing endpoint smoke requests**

Expected initial behavior before implementation:
- unauthenticated -> 401
- authenticated foreign resource -> 404/403

**Step 2: Implement guard helper**

Create `require-user-session` for:
- authenticated session required
- role-aware customer path

**Step 3: Implement endpoints using service methods**

Keep handlers thin:
- parse with Zod
- call service
- map errors to HTTP statuses

**Step 4: Verify endpoint behavior**

Run: `cd nextjs-project && npm run lint && npm run build`  
Expected: build passes with new API routes.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/app/api/account src/lib/auth/require-user-session.ts
git commit -m "feat: add account api endpoints with ownership checks"
```

### Task 5: Registration and email verification backend (D)

**Files:**
- Create: `nextjs-project/src/app/api/auth/register/route.ts`
- Create: `nextjs-project/src/app/api/auth/verify-email/request/route.ts`
- Create: `nextjs-project/src/app/api/auth/verify-email/confirm/route.ts`
- Create: `nextjs-project/src/services/email-verification.service.ts`
- Modify: `nextjs-project/src/lib/auth.ts`
- Modify: `nextjs-project/src/types/next-auth.d.ts`
- Modify: `nextjs-project/src/services/user.service.ts` (selectors/update helpers)

**Step 1: Write failing flow checks**

Flow to fail first:
- register creates user but no verification token flow yet
- verify confirm cannot mark `emailVerifiedAt`
- session missing `isEmailVerified`

**Step 2: Implement token service**

`email-verification.service.ts`:
- token generation
- hash-only storage
- expiry and single-use checks
- mark used and set `emailVerifiedAt`

**Step 3: Implement request/confirm routes with rate limits**

Reuse existing rate-limit helpers and return safe generic responses.

**Step 4: Add registration route**

- create USER
- normalize email
- hash password
- auto-login compatibility with current auth strategy

**Step 5: Extend session typing and callback**

Populate `session.user.isEmailVerified` in `src/lib/auth.ts`.

**Step 6: Verify auth flow**

Run: `cd nextjs-project && npm run lint && npm run build`  
Expected: build passes; no type regressions in NextAuth callbacks.

**Step 7: Commit**

```bash
cd nextjs-project
git add src/app/api/auth/register/route.ts src/app/api/auth/verify-email src/services/email-verification.service.ts src/lib/auth.ts src/types/next-auth.d.ts src/services/user.service.ts
git commit -m "feat: add customer registration and email verification flow"
```

### Task 6: LK pages and verified-user guards (E)

**Files:**
- Create: `nextjs-project/src/app/(site)/account/page.tsx`
- Create: `nextjs-project/src/app/(site)/account/orders/page.tsx`
- Create: `nextjs-project/src/app/(site)/account/orders/[id]/page.tsx`
- Create: `nextjs-project/src/app/(site)/account/addresses/page.tsx`
- Create: `nextjs-project/src/components/site/account/*` (dashboard, orders table, address form/list, verify banner)

**Step 1: Add failing rendering checks**

Checklist:
- unverified user sees verify CTA
- unverified user cannot access orders/addresses
- verified user can access all account pages

**Step 2: Implement route-level guard helpers**

Server-side guard in RSC pages:
- session required
- verified requirement for sensitive pages

**Step 3: Implement minimal UI**

Use existing design tokens and shadcn-compatible patterns.

**Step 4: Verify pages**

Run: `cd nextjs-project && npm run lint && npm run build`  
Expected: RSC pages compile and route tree is valid.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/app/'(site)'/account src/components/site/account
git commit -m "feat: add customer account pages with verification gates"
```

### Task 7: Cart saved-address integration (F)

**Files:**
- Modify: `nextjs-project/src/components/site/cart-page-content.tsx`
- Create: `nextjs-project/src/components/site/saved-address-selector.tsx`
- Create: `nextjs-project/src/lib/mappers/user-address-to-shipping.ts`

**Step 1: Add failing interaction checks**

Expected failures before implementation:
- no selector for verified user
- selecting saved address does not hide manual fields
- payload not aligned with existing order shipping schema

**Step 2: Implement data loading and selector UI**

For verified user only:
- fetch addresses
- render selector with "use another address"

**Step 3: Implement mapping logic**

Map selected `UserAddress` into existing payload fields:
- `deliveryMethod`
- `cdekCityCode`
- `cdekPvzCode`
- door fields

**Step 4: Hide manual delivery inputs when saved selected**

Preserve guest behavior unchanged.

**Step 5: Verify checkout payload compatibility**

Run: `cd nextjs-project && npm run lint && npm run build`  
Expected: no typing regressions; order API accepts payload.

**Step 6: Commit**

```bash
cd nextjs-project
git add src/components/site/cart-page-content.tsx src/components/site/saved-address-selector.tsx src/lib/mappers/user-address-to-shipping.ts
git commit -m "feat: integrate saved account addresses into checkout flow"
```

### Task 8: SDEK tracking capture and display (G)

**Files:**
- Modify: `nextjs-project/src/lib/cdek.ts`
- Modify: `nextjs-project/src/services/order.service.ts`
- Modify: `nextjs-project/src/app/(site)/account/orders/[id]/page.tsx`
- Modify: `nextjs-project/src/app/api/admin/orders/[id]/cdek-shipment/route.ts` (if needed)

**Step 1: Add failing display/checklist scenarios**

- order detail does not show `cdekTrackNumber`
- fallback text missing when tracking is unavailable

**Step 2: Capture track number when available**

Persist `cdekTrackNumber` in order update flow (without breaking current CDEK create path).

**Step 3: Render tracking info in account order details**

Show:
- `cdekOrderUuid`
- `cdekTrackNumber` or fallback
- tracking link when possible

**Step 4: Verify end-to-end compatibility**

Run: `cd nextjs-project && npm run lint && npm run build`  
Expected: successful build, no regressions in existing order admin flow.

**Step 5: Commit**

```bash
cd nextjs-project
git add src/lib/cdek.ts src/services/order.service.ts src/app/'(site)'/account/orders/[id]/page.tsx src/app/api/admin/orders/[id]/cdek-shipment/route.ts
git commit -m "feat: surface cdek tracking details in customer account"
```

### Task 9: Final verification and cleanup

**Files:**
- Modify: any small fixes discovered during verification
- Create/Update: docs notes if behavior differs from spec

**Step 1: Run full verification**

Run:
- `cd nextjs-project && npm run lint`
- `cd nextjs-project && npm run build`
- `cd nextjs-project && npx prisma validate`

Expected: all commands pass.

**Step 2: Perform manual smoke checks**

- Register user, verify email, open `/account`
- Confirm unverified gates on orders/addresses
- Create and use saved address in cart
- Confirm guest checkout unchanged
- Confirm order detail shows tracking block

**Step 3: Final commit**

```bash
cd nextjs-project
git add .
git commit -m "feat: implement lk users account flow from schema to checkout integration"
```
