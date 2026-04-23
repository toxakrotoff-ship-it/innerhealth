# Gift with purchase: auto-add gift line to cart

## Goal
When a user’s cart meets an active “gift with purchase” promotion condition, the **gift product must appear in the cart** as a dedicated line with:

- **Label**: clearly marked as “Подарок”
- **Price**: **0 ₽**
- **Restrictions**: **cannot be removed** and **quantity cannot be changed** (for now)

Promotions are configured in the admin area and already exist in the backend.

## Non-goals (for this iteration)
- Letting the user remove the gift line (flow will be agreed later).
- Handling user-selected gifts (multiple-choice gifts).
- Persisting “gift dismissed” state.

## Current state (observed)
- Gift promotions are calculated on the server via `calculateGiftsForOrder(...)` in `src/services/gift-promotion.service.ts`.
- Gifts are currently added **only during order creation** (`src/services/order.service.ts`) and stored as `OrderItem` with `isGift=true` and `price=0`.
- Cart state is client-side (Zustand `src/store/cart-store.ts`), persisted with only `productId` + `quantity`, and enriched via `/api/products/cart-items`.

## Proposed approach (B): server-calculated gifts + cart synchronization

### Overview
Add a new public API endpoint that computes gift lines for the current cart using the existing backend logic.

To avoid duplication, races, and inconsistent states, **gift synchronization is performed in exactly one place on the client**:

- A single client “orchestrator” component `CartGiftSync` mounted once (recommended in `src/app/(site)/layout.tsx`)
- A single idempotent cart-store reconciliation function (e.g. `applyGiftLines(...)`) inside `src/store/cart-store.ts`

All UI surfaces (cart page, cart drawer) simply render `items` from the cart store and do not implement gift logic.

### API: `POST /api/cart/gifts`
**Request**

- `items`: array of cart items (non-gifts only)
  - `productId: string`
  - `quantity: number`
  - `price: number`
  - `hasPromoPrice: boolean`
- `hasPromoCode: boolean`
- `brandId?: string | null` (taken from site brand context / query)

**Response**

- `gifts`: array of calculated gift lines
  - `giftProductId: string`
  - `quantity: number`
  - `giftPromotionId: string`

**Rules**
- Use `calculateGiftsForOrder` on the server; do not duplicate business logic on the client.
- Gifts are computed from **base totals** as implemented in `calculateGiftsForOrder`.
- The endpoint must be safe and fast:
  - validate inputs at boundary (types, non-negative qty, reasonable list length)
  - `Cache-Control: no-store` (depends on dynamic cart content)

### Cart model changes (`CartLine`)
Extend `CartLine` with:

- `isGift?: boolean`
- `giftPromotionId?: string | null`

Gift line invariants in the cart:

- `price = 0`
- `isGift = true`
- `quantity = calculated quantity`
- `title/photo/slug` are still enriched via existing `/api/products/cart-items`
- `hasPromoPrice = true` (ensures promo code logic never discounts the gift)
- `isPromoEligible = false`

### Synchronization algorithm (client)
Inputs that trigger sync:

- cart items (productId/quantity/price/hasPromoPrice), excluding gifts
- `hasPromoCode` (boolean derived from promo state)
- `brandId`

Algorithm:

1. `CartGiftSync` builds `syncItems` = cart lines where `isGift !== true`
2. `CartGiftSync` calls `POST /api/cart/gifts` with `syncItems`, `hasPromoCode`, `brandId`
3. `CartGiftSync` calls a single store function (e.g. `applyGiftLines({ gifts })`) which reconciles the cart:
   - For each returned gift line: ensure a corresponding cart line exists with `isGift=true` and set quantity to required value
   - If a gift line currently exists in cart but is not in response anymore: remove it

Stability / UX:

- Debounce network calls (e.g. 250–400ms) to avoid spamming on quantity edits.
- Avoid infinite loops: reconciliation must be idempotent and `CartGiftSync` must ignore changes that are only gift-line changes (e.g. derive a dependency key from non-gift lines only).

### UI changes
Cart list rendering (both cart page and drawer):

- Gift lines show a badge “Подарок”.
- Price display shows **0 ₽** (line total).
- Quantity input and “Удалить” action are disabled/hidden for gift lines.

Totals:

- Gifts do not change totals since price is 0.
- Promo code math remains as-is; gift line is treated as non-discountable.

### Order submission
When submitting order:

- Send only non-gift items in `items` payload to `/api/orders`.
- Backend continues to compute and attach gift items transactionally; this avoids duplication.

## Error handling
- If gift calculation request fails, the cart still works; we simply don’t show gift lines and can show a non-blocking note (optional).
- If enrichment of gift product details fails, the line may temporarily show “Загрузка...” with 0 ₽.

## Testing plan (high-level)
- Unit test reconciliation logic (idempotent add/update/remove).
- Integration: cart page -> meets condition -> gift line appears with 0 ₽ and no remove/qty controls.
- Regression: checkout still creates order with gift items (from backend) and does not double-add.

