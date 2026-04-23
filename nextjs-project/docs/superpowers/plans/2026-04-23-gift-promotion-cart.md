# Gift promotion in cart implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically show “gift with purchase” items inside the cart as non-removable lines with 0 ₽ price, based on server-calculated gift promotions.

**Architecture:** Keep gift business logic in one place on the server (`calculateGiftsForOrder`). On the client, compute gifts via a single API call orchestrated by one mounted component (`CartGiftSync`) and reconcile the cart via one idempotent store function (`applyGiftLines`).

**Tech Stack:** Next.js App Router, TypeScript, Zustand, Prisma (server-only services), Jest/Vitest (existing tests in repo).

---

## File map

**Create**
- `src/app/api/cart/gifts/route.ts` — public endpoint to calculate gifts for current cart
- `src/components/site/cart-gift-sync.tsx` — single orchestrator component mounted once

**Modify**
- `src/store/cart-store.ts` — add `isGift`, `giftPromotionId`, and `applyGiftLines`, plus helpers
- `src/app/(site)/layout.tsx` — mount `CartGiftSync`
- `src/components/site/cart-page-content.tsx` — render gift badge, disable remove/qty for gifts, exclude gifts from order payload
- `src/components/site/cart-drawer.tsx` — same rendering constraints for gift lines

**Test**
- `src/store/cart-store.test.ts` — unit tests for reconciliation idempotency and add/update/remove behavior
- (Optional if test infra exists) `src/components/site/cart-page-content.test.tsx` — ensure gift line hides controls

---

### Task 1: Add cart-store gift reconciliation (TDD)

**Files:**
- Modify: `src/store/cart-store.ts`
- Test: `src/store/cart-store.test.ts`

- [ ] **Step 1: Write failing tests for `applyGiftLines`**

Add tests (example skeleton; adapt to existing test runner):

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { useCartStore, type CartLine } from './cart-store'

function setCart(items: CartLine[]) {
  useCartStore.setState({ items })
}

describe('applyGiftLines', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isDrawerOpen: false, ownerKey: null })
  })

  it('adds a gift line when missing', () => {
    setCart([{ productId: 'A', quantity: 1, price: 100 }])
    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 1, giftPromotionId: 'P1' }],
    })
    const items = useCartStore.getState().items
    expect(items.some((i) => i.productId === 'G1' && i.isGift)).toBe(true)
  })

  it('updates gift quantity and promotion id', () => {
    setCart([{ productId: 'G1', quantity: 1, price: 0, isGift: true, giftPromotionId: 'P1' }])
    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 2, giftPromotionId: 'P2' }],
    })
    const g = useCartStore.getState().items.find((i) => i.productId === 'G1')
    expect(g?.quantity).toBe(2)
    expect(g?.giftPromotionId).toBe('P2')
  })

  it('removes gift lines not present in result', () => {
    setCart([
      { productId: 'A', quantity: 1, price: 100 },
      { productId: 'G1', quantity: 1, price: 0, isGift: true, giftPromotionId: 'P1' },
    ])
    useCartStore.getState().applyGiftLines({ gifts: [] })
    expect(useCartStore.getState().items.some((i) => i.isGift)).toBe(false)
  })

  it('is idempotent for same gifts', () => {
    setCart([{ productId: 'A', quantity: 1, price: 100 }])
    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 1, giftPromotionId: 'P1' }],
    })
    const once = useCartStore.getState().items
    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 1, giftPromotionId: 'P1' }],
    })
    const twice = useCartStore.getState().items
    expect(twice).toEqual(once)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run (choose the repo’s runner; one of these should exist):
- `npm test -- -t applyGiftLines`
- `cd nextjs-project && npm test -- -t applyGiftLines`
- `cd nextjs-project && npm run test`

Expected: FAIL because `applyGiftLines` does not exist.

- [ ] **Step 3: Implement minimal `applyGiftLines`**

Implement in `src/store/cart-store.ts`:

```ts
export interface GiftLineInput {
  readonly giftProductId: string
  readonly quantity: number
  readonly giftPromotionId: string
}

applyGiftLines(params: { readonly gifts: readonly GiftLineInput[] }) {
  set((state) => {
    const nonGift = state.items.filter((i) => i.isGift !== true)
    const byId = new Map(params.gifts.map((g) => [g.giftProductId, g]))

    const nextGifts = params.gifts.map((g) => ({
      productId: g.giftProductId,
      quantity: Math.max(1, g.quantity),
      price: 0,
      title: undefined,
      photo: null,
      slug: null,
      isGift: true,
      giftPromotionId: g.giftPromotionId,
      hasPromoPrice: true,
      isPromoEligible: false,
      discountPrice: null,
    }))

    // Preserve order: non-gifts first, then gifts (stable).
    const items = [...nonGift, ...nextGifts]

    // Cheap idempotency check.
    if (items.length === state.items.length) {
      const same = items.every((it, idx) => {
        const prev = state.items[idx]
        return (
          prev?.productId === it.productId &&
          prev?.quantity === it.quantity &&
          (prev?.isGift ?? false) === (it.isGift ?? false) &&
          (prev?.giftPromotionId ?? null) === (it.giftPromotionId ?? null)
        )
      })
      if (same) return state
    }

    return { items }
  })
}
```

- [ ] **Step 4: Run tests to verify pass**

Run same command as Step 2.
Expected: PASS.

---

### Task 2: Add server endpoint `POST /api/cart/gifts` (TDD-ish)

**Files:**
- Create: `src/app/api/cart/gifts/route.ts`
- (Optional) Test: add a minimal unit test if API tests exist; otherwise rely on typecheck + manual call

- [ ] **Step 1: Implement route with validation**

Create:

```ts
import { NextResponse } from 'next/server'
import { calculateGiftsForOrder } from '@/services/gift-promotion.service'
import type { BrandId } from '@/lib/brand/brand'

interface GiftCalcItemInput {
  productId: string
  quantity: number
  price: number
  hasPromoPrice: boolean
}

function parseBody(value: unknown): {
  items: GiftCalcItemInput[]
  hasPromoCode: boolean
  brandId: BrandId | null
} {
  if (typeof value !== 'object' || value == null) throw new Error('Invalid payload')
  const v = value as Record<string, unknown>
  const items = Array.isArray(v.items) ? (v.items as unknown[]) : []
  const hasPromoCode = Boolean(v.hasPromoCode)
  const brandId = typeof v.brandId === 'string' ? (v.brandId as BrandId) : null

  const parsedItems: GiftCalcItemInput[] = items
    .map((raw) => raw as Record<string, unknown>)
    .map((i) => ({
      productId: String(i.productId ?? ''),
      quantity: Number(i.quantity ?? 0),
      price: Number(i.price ?? 0),
      hasPromoPrice: Boolean(i.hasPromoPrice),
    }))
    .filter((i) => i.productId.trim().length > 0)
    .map((i) => ({
      ...i,
      quantity: Number.isFinite(i.quantity) ? Math.max(0, Math.floor(i.quantity)) : 0,
      price: Number.isFinite(i.price) ? Math.max(0, i.price) : 0,
    }))

  if (parsedItems.length > 200) throw new Error('Too many items')

  return { items: parsedItems, hasPromoCode, brandId }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, hasPromoCode, brandId } = parseBody(body)
    const gifts = await calculateGiftsForOrder({ items, hasPromoCode, brandId })
    return NextResponse.json(
      { gifts },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
```

- [ ] **Step 2: Quick manual verification**

Run dev server and curl (adjust port if needed):
- `cd nextjs-project && npm run dev`
- `curl -s -X POST "http://localhost:3000/api/cart/gifts" -H "Content-Type: application/json" -d '{"items":[{"productId":"x","quantity":1,"price":100,"hasPromoPrice":false}],"hasPromoCode":false,"brandId":null}'`

Expected: `{"gifts":[...]}` (possibly empty array depending on active promos).

---

### Task 3: Add `CartGiftSync` orchestrator and mount once

**Files:**
- Create: `src/components/site/cart-gift-sync.tsx`
- Modify: `src/app/(site)/layout.tsx`

- [ ] **Step 1: Implement `CartGiftSync`**

```tsx
'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useCartStore } from '@/store/cart-store'
import { getCookieValue } from '@/lib/cookies'

interface GiftApiResponse {
  gifts: Array<{ giftProductId: string; quantity: number; giftPromotionId: string }>
}

function buildNonGiftKey(items: Array<{ productId: string; quantity: number; price?: number; hasPromoPrice?: boolean; isGift?: boolean }>): string {
  return items
    .filter((i) => i.isGift !== true)
    .map((i) => `${i.productId}:${i.quantity}:${i.price ?? 0}:${i.hasPromoPrice ? 1 : 0}`)
    .sort()
    .join('|')
}

export function CartGiftSync({ hasPromoCode }: { hasPromoCode: boolean }) {
  const items = useCartStore((s) => s.items)
  const applyGiftLines = useCartStore((s) => s.applyGiftLines)

  const nonGiftKey = useMemo(() => buildNonGiftKey(items), [items])
  const lastAppliedKeyRef = useRef<string | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!nonGiftKey) {
      applyGiftLines({ gifts: [] })
      return
    }

    if (debounceRef.current != null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const controller = new AbortController()
      const brandId = getCookieValue('ih_active_brand')

      void fetch('/api/cart/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items
            .filter((i) => i.isGift !== true)
            .map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price ?? 0,
              hasPromoPrice: Boolean(i.hasPromoPrice),
            })),
          hasPromoCode,
          brandId: brandId ?? null,
        }),
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(async (r) => {
          const data = (await r.json()) as GiftApiResponse | { error?: string }
          if (!r.ok) throw new Error('error' in data ? (data.error ?? 'Gift calc failed') : 'Gift calc failed')
          const nextKey = `${nonGiftKey}::${hasPromoCode ? 1 : 0}::${brandId ?? ''}`
          if (lastAppliedKeyRef.current === nextKey) return
          lastAppliedKeyRef.current = nextKey
          applyGiftLines({ gifts: (data as GiftApiResponse).gifts })
        })
        .catch(() => {})

      return () => controller.abort()
    }, 300)

    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current)
    }
  }, [nonGiftKey, items, hasPromoCode, applyGiftLines])

  return null
}
```

Notes:
- `hasPromoCode` is passed in by whoever manages promo code state. In this repo promo code is stored in `CartPageContent` local state; for now we’ll mount `CartGiftSync` on cart page only OR we’ll set it to always `false` until promo state is lifted. (Implementation will decide based on repo constraints.)

- [ ] **Step 2: Mount `CartGiftSync` once**

In `src/app/(site)/layout.tsx` render `<CartGiftSync hasPromoCode={false} />` once near the root.
If promo code must be considered, lift promo state to a global store or accept `false` for first iteration.

---

### Task 4: Update cart UI to render gifts and prevent remove/qty changes

**Files:**
- Modify: `src/components/site/cart-page-content.tsx`
- Modify: `src/components/site/cart-drawer.tsx`

- [ ] **Step 1: Cart page line rendering**

In the `items.map(...)` loop:
- derive `const isGift = line.isGift === true`
- if `isGift`, set `lineTotalAfterPromo` = 0 (or keep computed but price is 0)
- pass `isGift` to `CartLineRow`

Update `CartLineRow` props to include `isGift`.
In `CartLineRow`:
- show “Подарок” badge (small pill)
- hide/disable quantity input
- hide/disable remove button
- always show total `0 ₽` for gift line

- [ ] **Step 2: Cart drawer**

Apply similar logic wherever drawer renders line actions.

- [ ] **Step 3: Order submit excludes gifts**

In `handleSubmitOrder` payload:

```ts
items: items
  .filter((i) => i.isGift !== true)
  .map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price ?? 0 })),
```

---

### Task 5: Wire promo-code interaction (optional refinement)

If promo code state remains local to cart page, gifts may need to account for “promo code present” interaction mode.
Options:
- Add a tiny `promo-store` (Zustand) that holds `hasPromoCode` boolean and is set by cart page after validation; `CartGiftSync` reads it.
- Or mount `CartGiftSync` only on cart page and pass `hasPromoCode` directly.

This task is only required if gift promotions use `promoCodeInteractionMode`.

---

### Task 6: Verification

- [ ] Run typecheck / build:
  - `cd nextjs-project && npm run build`
- [ ] Run tests:
  - `cd nextjs-project && npm run test` (or repo equivalent)
- [ ] Manual check:
  - Add items to cart, reach threshold, confirm gift appears with “Подарок” and 0 ₽ and no controls
  - Drop below threshold, confirm gift disappears
  - Checkout still works, and order includes gift only once (from backend)

