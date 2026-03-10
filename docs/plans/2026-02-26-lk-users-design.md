# LK Users Design (A-G)

Date: 2026-02-26
Project: InnerHealth
Scope: `docs/LK-users.md` tasks `A -> G`

## 1. Architecture and Delivery Strategy

### Recommended approach

Use vertical increments with strict checkpoints:

1. Task A: Prisma schema and migration
2. Task B: DAL services and Zod boundaries
3. Task C: Account API wrappers and auth ownership checks
4. Task D: Register + email verification flow and gates
5. Task E: LK pages and guarded UX
6. Task F: Cart saved-address integration
7. Task G: SDEK tracking display

After each task, run focused verification (type/lint/build/smoke) before moving to the next task.

### Layering rules

- Prisma and data models: `nextjs-project/prisma/*`
- Business logic: `nextjs-project/src/services/*`
- Input boundaries: `nextjs-project/src/lib/validations/*`
- API handlers: `nextjs-project/src/app/api/*` as thin wrappers
- LK UI: `nextjs-project/src/app/(site)/account/*`
- Checkout integration: keep changes minimal in `src/components/site/cart-page-content.tsx`

### Security baseline

- Every customer-bound operation is filtered by `session.user.id`.
- For unverified users (`isEmailVerified = false`), deny addresses CRUD and orders read.
- Cart remains guest-friendly and must keep current guest path working.

## 2. Data Model and Migration Design (Task A)

### User and Order relation

Add explicit bidirectional relation:

- `User.orders: Order[]`
- `Order.user: User? @relation(fields: [userId], references: [id], onDelete: SetNull)`
- Index in `Order`: `@@index([userId, createdAt])`

### UserAddress model

Add `UserAddress` with SDEK-compatible data:

- Identity and ownership: `id`, `userId`
- Display: `label`, `city`, `postalCode?`, `addressLine`
- SDEK core: `deliveryMethod`, `cdekCityCode`, `cdekPvzCode?`
- Door fields: `street?`, `house?`, `apartment?`, `entrance?`, `floor?`, `intercom?`
- Timestamps and index: `createdAt`, `updatedAt`, `@@index([userId, updatedAt])`

Constraint "max 3 addresses per user" is enforced in service layer, not schema.

### Order tracking additions

- Add `Order.cdekTrackNumber: String?`
- Optional future-safe `Order.shippingStatus: String?` if needed by UI later

### Email verification entities

- Add `User.emailVerifiedAt: DateTime?`
- Add `EmailVerificationToken`:
  - `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt?`, `createdAt`
  - unique token hash
  - indexes for cleanup and lookup (`[userId, expiresAt]`, `[expiresAt]`)

## 3. Backend Contracts and Security Gates (Tasks B/C/D)

### Services

- `account.service.ts`
  - `getAccountDashboard(userId)`
  - `getUserOrders(userId, pagination)`
  - `getUserOrderById(userId, orderId)` with `(id, userId)` filter
- `user-address.service.ts`
  - list/create/update/delete with ownership checks
  - enforce max 3 addresses before create

### Validation schemas

- `user-address` schema:
  - `cdek_pvz`: require `cdekPvzCode`, `addressLine`
  - `cdek_door`: require `street`, `house`
  - always require `cdekCityCode`, `city`
- account/auth schemas:
  - dashboard and orders query params
  - register payload
  - verify request/confirm payload

### API endpoints

- `GET /api/account/dashboard`
- `GET /api/account/orders`
- `GET /api/account/orders/[id]`
- `GET/POST /api/account/addresses`
- `PATCH/DELETE /api/account/addresses/[id]`
- `POST /api/auth/register`
- `POST /api/auth/verify-email/request`
- `POST /api/auth/verify-email/confirm`

All handlers remain thin and delegate to services.

### Session and auth integration

- Extend NextAuth session typing with `isEmailVerified`.
- Populate it from `User.emailVerifiedAt` in `session` callback.
- Preserve admin behavior; route `USER` to `/account`.

### Verification gates

When user is not email verified:

- Deny orders list/detail.
- Deny addresses CRUD.
- Keep verify request/confirm endpoints available.
- Hide saved-address selector from cart.

## 4. LK UI, Cart Integration, Tracking (Tasks E/F/G)

### LK pages

- `/account`: profile summary + order stats + shortcuts
- `/account/orders`: paginated orders table
- `/account/orders/[id]`: full order details and delivery block
- `/account/addresses`: address CRUD forms for PVZ and Door modes

### Verification UX

- Persistent banner on `/account*` when not verified.
- CTA to request a new verification email.
- Guarded routes either redirect to verify flow or return blocked state.

### Cart behavior

For authenticated and verified users:

- Load saved addresses.
- Add selector ("saved address" / "use another").
- On selection, fill current checkout delivery fields and hide manual address inputs.

For guests and non-verified users:

- Keep current manual checkout flow unchanged.

### SDEK tracking UX

In account order details:

- Display `cdekOrderUuid`.
- Display `cdekTrackNumber` if available.
- Show tracking link if track number exists.
- Show neutral fallback text otherwise.

## 5. Verification Plan and Rollout Checkpoints

### After Task A

- Validate Prisma schema and client generation.
- Apply migration in local environment.
- Smoke check existing order creation path.

### After Tasks B/C

- Validate ownership checks on order and address access.
- Validate 3-address limit and PVZ/Door rules.
- Validate rate-limit behavior on mutating endpoints.

### After Task D

- Register as `USER`, auto-login, verify flow available.
- Verify token single-use and expiry behavior.
- Confirm `session.user.isEmailVerified` value is correct.
- Confirm unverified user gates are enforced.

### After Tasks E/F/G

- Account pages render with correct authorization boundaries.
- Cart integration works for verified user and does not break guest flow.
- Tracking field displays correctly with fallback.

### Final regression

- Run lint, typecheck, and build.
- Smoke checkout path with promo and SDEK.

## 6. Security Hardening Addendum (USER Branch)

This addendum defines anti-abuse and input-hardening controls for customer auth and profile entry points.

### 6.1 Email risk controls (balanced mode)

Apply a balanced strategy:

- Block clearly disposable/throwaway domains at registration and verification request boundaries.
- Keep neutral responses for existence-sensitive flows to reduce enumeration.
- Do not rely on syntax-only validation.

Scope:

- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/verify-email/request/route.ts`
- `src/lib/validations/account.ts`
- `src/services/*` for domain checks and normalization

### 6.2 Input boundary hardening

Normalize and constrain user-entered text fields:

- remove control characters and zero-width characters
- trim and collapse repeated spaces
- keep strict length limits
- apply safe allow-lists for `name`, `lastName`, `phone`

This protects downstream logs/templates and reduces injection-style payload pollution.

### 6.3 Distributed rate limiting for auth flows

Current in-memory limiter is not enough for horizontally scaled deployments.
Migrate auth-related limits to shared storage (e.g. Upstash Redis), keyed by:

- IP
- route
- user/email hash (where applicable)

Minimum protected endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login-step1`
- `POST /api/auth/verify-2fa`
- `POST /api/auth/2fa/send-code`
- `POST /api/auth/verify-email/request`
- `POST /api/auth/verify-email/confirm`

### 6.4 2FA UX hardening

Replace single OTP field with six one-character fields:

- numeric-only, one symbol per cell
- auto-advance and backspace navigation
- robust paste support from any cell (`Ctrl+V`/context paste)
- normalize pasted content to digits and distribute to 6 cells

Target file:

- `src/app/login/2fa/page.tsx`

### 6.5 Acceptance criteria (security addendum)

- Disposable domains are rejected at registration boundary.
- Auth/verification endpoints are resistant to brute-force and resend abuse in multi-instance mode.
- Inputs for user profile fields are normalized and bounded by schema-level rules.
- 2FA code input supports secure 6-cell UX with paste distribution and no extra characters.
