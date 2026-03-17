# Admin Orders Trash & Deletion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a soft-delete “trash” mechanism for admin orders with per-order deletion, restore, and both manual and weekly cleanup, so that deleted orders disappear from CRM/statistics but can be recovered for a limited time.

**Architecture:** We extend the existing `Order` model with soft-delete metadata (`deletedAt`, optionally `deletedByAdminId`) and make all read paths used by admin CRM and statistics ignore deleted orders. Admin UI for orders gains: (1) a “Move to trash” action that sets `deletedAt`, (2) a “Trash” view/filter to list deleted orders with a “Restore” action, and (3) a “Force clear trash” button that permanently deletes orders soft-deleted more than 7 days ago. Weekly cleanup is implemented via a dedicated API route that removes stale trash and can be called either by cron or manually from the UI.

**Tech Stack:** Next.js App Router, React (client components in admin), Prisma with PostgreSQL, existing admin auth/guarding, Tailwind-based admin UI.

---

## Task 1: Extend Prisma `Order` model for soft delete

**Files:**
- Modify: `prisma/schema.prisma` around `model Order`

**Steps:**
1. Add nullable `deletedAt: DateTime?` to `Order`, plus an index `@@index([deletedAt, createdAt])` to make cleanup queries efficient.
2. (Optional but recommended) Add `deletedByAdminId: String?` if there is a clear admin identity to store; if not obvious, skip for now.
3. Run `npx prisma migrate dev --name add-order-soft-delete` to create and apply the migration.

**Notes:** No changes to `OrderItem` or `ShippingInfo` are required; they will be filtered indirectly via `Order`.

---

## Task 2: Update admin orders fetch to ignore trashed orders

**Files:**
- Locate/Modify: API route that backs `/api/admin/orders` (likely under `src/app/api/admin/orders/route.ts` or similar).

**Steps:**
1. Find the handler that returns `Order[]` for both `AdminOrdersPage` and `OrdersStatisticsPage`.
2. Update Prisma queries to include `where: { deletedAt: null }` so that trashed orders are excluded from CRM and statistics by default.
3. Add an optional query parameter (e.g. `?includeDeleted=1` or `?trash=1`) that allows fetching only deleted orders (`where: { deletedAt: { not: null } }`) for the trash view.
4. Ensure the returned JSON keeps the same shape that `AdminOrdersPage` and `OrdersStatisticsPage` expect.

---

## Task 3: Implement API to soft-delete (move to trash) a single order

**Files:**
- Add/Modify: `src/app/api/admin/orders/[orderId]/trash/route.ts` (or similar nested route)

**Steps:**
1. Implement a `POST` handler that:
   - Validates `orderId` from the route using Zod.
   - Checks admin auth/permissions as other admin API routes do.
   - Calls Prisma `order.update` with `data: { deletedAt: new Date() }` (only if `deletedAt` is currently `null`).
2. Return a JSON payload `{ success: true }` or a detailed error if order not found or already trashed.
3. Ensure errors are surfaced as non-2xx responses that the client can handle.

---

## Task 4: Implement API to restore a trashed order

**Files:**
- Add/Modify: `src/app/api/admin/orders/[orderId]/restore/route.ts`

**Steps:**
1. Implement a `POST` handler that:
   - Validates `orderId` using Zod.
   - Verifies admin access.
   - Uses Prisma `order.update` with `where: { id: orderId, deletedAt: { not: null } }` and `data: { deletedAt: null }`.
2. Return `{ success: true }` when restored, or an appropriate error if order is not in trash or missing.

---

## Task 5: Implement API for trash cleanup (weekly + manual)

**Files:**
- Add: `src/app/api/admin/orders/trash/cleanup/route.ts`

**Steps:**
1. Implement a `POST` handler that:
   - Verifies admin permissions.
   - Computes a cutoff date: `cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`.
   - Calls Prisma `order.deleteMany` with `where: { deletedAt: { lt: cutoff } }`.
2. Return JSON with something like `{ success: true, deletedCount }`.
3. This endpoint will be used both by:
   - A weekly cron/automation.
   - A manual “Force clear trash” button in the UI.

---

## Task 6: Add “Move to trash” button to admin orders table

**Files:**
- Modify: `src/app/admin/orders/page.tsx`

**Steps:**
1. Introduce local state `deletingOrderId` and `showTrash` or similar, if not already present.
2. In the desktop table row and mobile card, add a “Удалить в корзину” button:
   - Shows a `window.confirm` dialog (e.g. “Отправить заказ в корзину? Он исчезнет из CRM и статистики, но будет доступен в корзине 7 дней.”).
   - If confirmed, calls `fetch('/api/admin/orders/${order.id}/trash', { method: 'POST' })`.
   - On success, removes the order from the `orders` state or updates it to reflect `deletedAt` and then filters it out.
3. Disable the button / show a spinner while the delete is in progress for that order.
4. Ensure the button is only shown for non-trashed orders (if the same component will later be used to render trash view).

---

## Task 7: Add “Trash” view and restore button in admin orders

**Files:**
- Modify: `src/app/admin/orders/page.tsx`

**Steps:**
1. Add a UI toggle or tabs at the top of the page: e.g. buttons “Активные” и “Корзина”.
2. When “Корзина” is active:
   - Fetch orders from `/api/admin/orders?trash=1` (or a distinct endpoint) which returns only soft-deleted orders.
   - Render them with clear “(в корзине)” labeling and include a column “Дата удаления” if `deletedAt` is returned.
3. For each trashed order, add a “Восстановить” button that:
   - Calls `POST /api/admin/orders/${order.id}/restore`.
   - On success, removes it from the trash list and (optionally) re-inserts into the active list (if both lists are kept in state).
4. Make sure the search/filter behaviour is sensible in both modes (at minimum, ID search should continue to work in trash mode).

---

## Task 8: Add “Force clear trash” button in admin UI

**Files:**
- Modify: `src/app/admin/orders/page.tsx`

**Steps:**
1. In the “Корзина” view, add a clearly marked button (e.g. “Очистить корзину окончательно”) above the table/cards.
2. Clicking the button:
   - Shows a strong confirmation dialog explaining that all заказы, удалённые более 7 дней назад, будут удалены безвозвратно.
   - On confirmation, calls `POST /api/admin/orders/trash/cleanup`.
   - On success, either:
     - Re-fetch the trash list, or
     - Optimistically filter local `orders` state by `deletedAt` >= cutoff (if available on the client).
3. Handle error states with a simple alert or inline error message.

---

## Task 9: Ensure statistics page excludes trashed orders

**Files:**
- Modify: `src/app/admin/orders-statistics/page.tsx`

**Steps:**
1. Confirm that `OrdersStatisticsPage` only ever calls the orders endpoint that has been updated to filter by `deletedAt: null` by default.
2. If the statistics page has its own dedicated endpoint, update that backend query to filter out trashed orders, same as in Task 2.
3. Optionally, verify that any future additions to statistics (e.g. per-day metrics) also use this filter to avoid counting trashed orders.

---

## Task 10: Testing and verification

**Steps:**
1. Create several test orders (some with promo codes, some без).
2. Open `/admin/orders`:
   - Verify they appear in the active list.
   - Verify they also appear in `/admin/orders-statistics` with expected totals.
3. Move one or more orders to trash:
   - Ensure they disappear from the active CRM list.
   - Ensure they disappear from statistics totals and counts.
4. Switch to “Корзина”:
   - Verify trashed orders are visible with correct meta.
   - Restore one order and confirm it reappears in the active list and in statistics.
5. Manually backdate `deletedAt` in DB (or adjust cutoff logic) to simulate orders deleted more than 7 days ago, then:
   - Click “Очистить корзину окончательно” and confirm those orders are physically removed.
6. Run automated test suite if present, and smoke-test other admin areas (products, promo-codes) to ensure no regressions.

