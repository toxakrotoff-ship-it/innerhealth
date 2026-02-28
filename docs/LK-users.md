# LK (Users) — Customer Account Specification
Date: 2026-02-26  
Project: InnerHealth (Next.js App Router, Prisma/Postgres, NextAuth v5, Tailwind/shadcn)

This document is a **technical specification** and a **Copilot implementation guide** for the customer-facing account (“Личный кабинет”, LK).

## 0) Current system context (as-is)

- **Checkout is guest-first** and lives in `nextjs-project/src/components/site/cart-page-content.tsx` with client state in localStorage (`src/store/cart-store.ts`).
- Order creation endpoint: `nextjs-project/src/app/api/orders/route.ts`
  - Validates payload via Zod: `nextjs-project/src/lib/validations/order.ts`
  - Recalculates totals server-side (promo rules preserved)
  - Creates `Order` + `ShippingInfo` in `nextjs-project/src/services/order.service.ts`
- **SDEK**:
  - Calculator + PVZ search + order creation: `nextjs-project/src/lib/cdek.ts` and `src/app/api/cdek/*`
  - Orders already store: `Order.cdekOrderUuid` + `Order.cdekOrderError`
  - Shipping stores: `deliveryMethod`, `cdekCityCode`, `cdekPvzCode`, `cdekTariffCode`, door address fields in `ShippingInfo`
- **Auth**:
  - NextAuth v5 credentials is implemented for admin in `nextjs-project/src/lib/auth.ts` and `/api/auth/[...nextauth]`
  - Session has `role` and `mustChangePassword` (`nextjs-project/src/types/next-auth.d.ts`)
  - Existing login UI routes under `nextjs-project/src/app/login/*`

## 1) Goals (MVP)

1. **Registration & login for customers** (hybrid):
   - Email + password registration
   - Password reset and/or login-by-email-code (hybrid UX)
   - **Email verification via SMTP** (required for full LK functionality)
2. **User stats (LK dashboard)**:
   - order counts, paid total, last order, status counters
3. **Order tracking**:
   - show order history + details
   - show SDEK tracking number (накладная) and “track” link
4. **Address book (1–3 addresses per user)** in **SDEK-compatible format**:
   - PVZ address (cityCode + pvzCode)
   - Door address (cityCode + structured fields)
   - Allow picking a saved address **from cart** and in that case **hide manual address selection** in checkout

## 2) Non-goals (for this iteration)

- Replacing localStorage cart with server cart
- Adding new delivery providers besides SDEK
- Complex shipment status history; keep it minimal
- Mandatory login to checkout (must remain guest-friendly)

## 3) UX flows (functional requirements)

### 3.1 Registration
- Route: `/register`
- Fields (MVP): email, password, name (optional), phone (optional)
- Validations:
  - email normalized (trim + lowercase)
  - password minimum length (define in Zod; recommended 10+)
  - rate limit by IP/email
- Result:
  - user created with role `USER`
  - user signed in (auto-login) and redirected to `/account`
  - system sends an **email verification link/code** via SMTP (see 6.4)

### 3.2 Login (hybrid)
- Route: `/login`
- If role is `ADMIN`: current behavior remains (redirect to admin area)
- If role is `USER`: redirect to `/account`
- Hybrid requirement:
  - provide “Forgot password / Login by code” by email
  - must be rate-limited

### 3.3 LK routes
- `/account` dashboard:
  - order stats (see section 7)
  - profile summary
  - shortcuts: orders, addresses
- `/account/orders`
  - list (paginated), newest first
  - columns: orderId, createdAt, status, total, delivery method
- `/account/orders/[id]`
  - order items, totals, delivery details (`ShippingInfo`)
  - SDEK: show `cdekOrderUuid`, `cdekTrackNumber` (MVP) and tracking link
- `/account/addresses`
  - list addresses
  - create/edit/delete
  - enforce 1–3 limit

### 3.4 Checkout integration
- Cart page `/cart`:
  - if user is authenticated (role `USER`):
    - show “Saved address” selector (including “Use another address”)
    - when a saved address is selected:
      - auto-populate delivery fields used for SDEK calculation
      - hide manual city/PVZ/door address inputs
      - still allow editing contact fields (email/phone/recipient name) depending on UX decision
  - if user is guest:
    - current UX unchanged

### 3.5 Email verification UX
- If `session.user.isEmailVerified === false`:
  - show a persistent banner on `/account*` pages with CTA “Confirm email”
  - allow requesting a new verification email (rate-limited, no user enumeration)
  - **restrict LK functionality to minimum and safe**:
    - allow only: profile view, verification request/confirm
    - deny: addresses CRUD, orders list/detail, “claim old orders”
  - checkout remains guest-friendly and must keep working; cart must not expose saved addresses until verified

## 4) Data model changes (Prisma)

### 4.1 Link orders to users
`Order` already has `userId: String?` but `User` currently has no `orders` relation in Prisma schema.

Add:
- `User.orders: Order[]`
- `Order.user: User? @relation(fields: [userId], references: [id], onDelete: SetNull)`
- Index: `@@index([userId, createdAt])`

### 4.2 Address book model
Add a new model: `UserAddress`.

Recommended fields (MVP):
- `id: String @id @default(cuid())`
- `userId: String` + relation to `User` (cascade on delete)
- `label: String` (e.g. “Home”, “Work”)
- `deliveryMethod: String` limited to `'cdek_pvz' | 'cdek_door'`
- `cdekCityCode: Int`
- For PVZ:
  - `cdekPvzCode: String?`
- For Door:
  - `street/house/apartment/entrance/floor/intercom: String?`
- Display fields (avoid recomputing on UI):
  - `city: String` (human readable)
  - `postalCode: String?`
  - `addressLine: String` (for PVZ: full PVZ address string; for door: joined)
- Timestamps + indexes:
  - `createdAt`, `updatedAt`
  - `@@index([userId, updatedAt])`

Limit 1–3 addresses:
- Enforce in service-layer (count by `userId` before create).

### 4.3 Tracking fields in Order
Add (MVP):
- `cdekTrackNumber: String?` (накладная / tracking number shown to customer)
- Optional: `shippingStatus: String?` (domain-neutral; if later want more providers)

Where to set `cdekTrackNumber`:
- When creating SDEK order in `createCdekOrder` (API response often contains `entity.uuid`; track number may require extra SDEK call — if so, store only uuid for MVP and add a “fetch track number” step later).

### 4.4 Email verification fields
Add to `User`:
- `emailVerifiedAt: DateTime?`

Add a token model (single-use):
- `EmailVerificationToken`
  - `id: String @id @default(cuid())`
  - `userId: String` (relation, cascade)
  - `tokenHash: String` (store only hash)
  - `expiresAt: DateTime`
  - `usedAt: DateTime?`
  - `createdAt: DateTime @default(now())`
  - indexes: `@@index([userId, expiresAt])`, `@@index([expiresAt])`, `@unique([tokenHash])`

## 5) Backend architecture requirements

Follow project architecture rules:
- **DAL/services** only in `nextjs-project/src/services/*` or `src/lib/*`
- API routes in `nextjs-project/src/app/api/*` are **thin** wrappers calling services
- Validate all user input boundaries with **Zod**
- No `any`

### 5.1 Services to add (suggested)
- `src/services/account.service.ts`
  - `getAccountDashboard(userId)`
  - `getUserOrders(userId, pagination)`
  - `getUserOrderById(userId, orderId)`
- `src/services/user-address.service.ts`
  - `listUserAddresses(userId)`
  - `createUserAddress(userId, data)` (enforce max=3)
  - `updateUserAddress(userId, addressId, data)` (ownership checks)
  - `deleteUserAddress(userId, addressId)` (ownership checks)

### 5.2 Zod validations to add
- `src/lib/validations/user-address.ts`
  - `userAddressSchema` (create/update)
  - refine rules:
    - if `deliveryMethod === 'cdek_pvz'` => require `cdekPvzCode` and `addressLine`
    - if `deliveryMethod === 'cdek_door'` => require `street` + `house` (minimum)
    - always require `cdekCityCode` + `city`

### 5.3 API routes / Server Actions
Preferred: **Server Actions** for mutations, RSC for reads, but cart is client-driven; mixing is OK.

Minimal endpoints (choose one style consistently):
- `/api/account/dashboard` (GET)
- `/api/account/orders` (GET)
- `/api/account/orders/[id]` (GET)
- `/api/account/addresses` (GET, POST)
- `/api/account/addresses/[id]` (PATCH, DELETE)

All account endpoints must:
- require authenticated session
- enforce `session.user.id` ownership
- be rate-limited where appropriate

## 6) Auth & security requirements

### 6.1 Authorization
- Customers must only see:
  - their own orders (`Order.userId === session.user.id`)
  - their own addresses (`UserAddress.userId === session.user.id`)
- Admin continues to use existing guards (`requireAdminSession`)

### 6.2 Rate limiting
Apply rate limiting to:
- register
- login by code / password reset
- email verification request/confirm
- addresses create/update/delete

### 6.3 Sensitive data
- Do not expose internal provider tokens
- Do not leak other users’ data through ID enumeration:
  - order detail endpoint must filter by `(id, userId)` not just `id`

### 6.4 Email verification (SMTP) requirements
- Sending:
  - Use SMTP (existing or new mailer in `src/lib/*`)
  - Verification email should include:
    - link with a random token (preferred) and/or a short code (optional)
  - Token must be **random**, **single-use**, **short-lived** (e.g. 30 minutes)
  - Store only `tokenHash` (bcrypt or SHA-256 with server secret) in DB
- Endpoints / actions:
  - `POST /api/auth/verify-email/request`
    - requires authenticated session
    - always returns 200 (do not reveal deliverability)
    - rate-limited per IP + per user
    - creates a new token, invalidates/marks previous tokens if needed
    - sends email
  - `POST /api/auth/verify-email/confirm`
    - accepts token, validates hash & expiry, sets `User.emailVerifiedAt = now()`, sets token `usedAt`
    - rate-limited
- Authorization gates (minimum & safe):
  - If user is not verified, LK endpoints must deny:
    - orders list/detail
    - addresses CRUD
    - claim/merge guest orders
  - UI must not render saved addresses selector in cart until verified
- Session typing:
  - Extend `next-auth.d.ts` session user with `isEmailVerified?: boolean`
  - Populate it in NextAuth `session` callback from `emailVerifiedAt`

## 7) User statistics (dashboard)

MVP metrics from `Order`:
- total orders count
- paid orders count
- sum of paid orders totals
- last order summary (id, status, total, createdAt)
- status counters: pending/paid/shipped/cancelled (depending on current status taxonomy)

Implementation note:
- Current `Order.status` is a string; define a documented set for LK rendering.

## 8) Checkout integration details (SDEK addresses)

### 8.1 “Saved address” selection behavior
- If selected saved address is `cdek_pvz`:
  - Set `deliveryMethod = 'cdek_pvz'`
  - Set `selectedCity` based on `cdekCityCode` + `city` label
  - Set `selectedPvz` based on `cdekPvzCode` (may require fetching PVZ list or storing PVZ display data in address record)
- If `cdek_door`:
  - Fill `doorAddress` + `cdekCityCode`
  - Ensure calculator uses that city code

### 8.2 Avoid breaking current order payload
Current order payload supports:
- `shipping.deliveryMethod`, `cdekCityCode`, `cdekPvzCode`, `cdekTariffCode`, `doorAddress`

So LK integration should:
- feed these exact fields when saved address is chosen
- keep existing server validations in `shippingSchema` valid

## 9) Acceptance criteria (Definition of Done)

- Registration creates `User` with `Role.USER` and logs in.
- New user receives verification email; after confirm, `emailVerifiedAt` is set and session reflects verified status.
- `/account` renders without client-side sensitive logic, shows stats and links.
- If email is **not verified**:
  - `/account/orders*` and `/account/addresses*` are blocked (403 or redirected to verify flow)
  - `/cart` does not allow using saved addresses
- `/account/orders` shows only the authenticated user’s orders.
- `/account/orders/[id]` refuses access to чужой orderId.
- `/account/addresses`:
  - can create/update/delete addresses
  - cannot exceed 3 addresses per user
  - both PVZ and Door formats work
- `/cart`:
  - for logged-in user: selecting a saved address removes/hides manual SDEK address selection and order submission uses saved values
  - guest checkout remains unchanged
- No new TypeScript `any`, no unvalidated user input

## 10) Copilot implementation checklist (step-by-step)

Use this as sequential tasks. Each task should be a separate PR/commit if possible.

### Task A — Prisma schema & migration
- Add relations `User <-> Order`
- Add `UserAddress` model
- Add `Order.cdekTrackNumber` (and optional status fields)
- Add `User.emailVerifiedAt` + `EmailVerificationToken` model
- Create migration with descriptive name, do not edit existing migrations

### Task B — DAL/services + Zod schemas
- Implement `user-address.service.ts`
- Implement `account.service.ts`
- Add `user-address` Zod schema
- Add ownership checks and limit=3 enforcement

### Task C — API / Server Actions
- Implement account endpoints:
  - addresses CRUD
  - orders list/detail
  - dashboard summary
- Apply auth guard and rate limit

### Task D — Auth UX
- Add `/register` page + API/action
- Add `/verify-email` page (or `/account/verify-email`) for handling token confirmations
- Add verification request/confirm endpoints or server actions (SMTP)
- Update `/login` redirect logic by role:
  - `ADMIN` -> admin area
  - `USER` -> `/account`
- Ensure password reset works for `USER`

### Task E — LK UI
- Build RSC pages under `src/app/(site)/account/*` (or a dedicated route group)
- Use shadcn UI for forms/tables
- Mobile-first layout

### Task F — Cart integration
- On cart page, when session exists:
  - load saved addresses
  - allow selecting one
  - on selection: set delivery fields and hide manual delivery inputs
- Ensure final POST `/api/orders` payload matches existing Zod schema

### Task G — SDEK tracking display
- Extend CDEK integration to capture/store `cdekTrackNumber` if available
- Show it in `/account/orders/[id]` and in admin order view (optional)

## 11) Notes & open decisions (fill before implementation)

- **Claim old guest orders**:
  - Option 1: claim by email code matching `ShippingInfo.email`
  - Option 2: claim by phone SMS (needs provider)
  - MVP recommendation: **email code** (no SMS dependency)
- **What exactly is “tracking number”** for SDEK in your ops:
  - If you need a specific field different from order UUID, confirm which SDEK API call provides it.

