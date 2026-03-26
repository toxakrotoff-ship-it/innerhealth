# Grouped Flavor Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render flavor variants (separate DB products) as a single grouped card in catalog-like listings, using `parentUid` to group and a selector to swap the active variant (photo/price/availability/add-to-cart).

**Architecture:** Add a small “grouping + selection” layer at the presentation boundary (listing pages). Fetch `parentUid` for listing items, group variants server-side, render either the existing `ProductCard` (single) or a new `GroupedProductCard` (client wrapper around existing card UI with flavor selector). Selection is local component state.

**Tech Stack:** Next.js App Router (RSC + client components), React 19, Prisma, Zod (where applicable), Tailwind.

---

## Decisions & assumptions (locked for this sprint)

- **`parentUid` semantics:** treat `null`, `''`, and whitespace-only as “no group” → render as single product card.
- **Availability rule (match existing `ProductCard` behavior):** consider a variant “available” when `quantity == null || quantity > 0 || isPreorderEnabled`. This keeps grouped cards consistent with the current card’s `isUnavailable` logic.
- **Base title + flavor label (required by spec):** implemented via a small heuristic against `title` (until we add explicit DB fields for flavor).
  - Supported patterns (MVP):
    - Split by ` — ` or ` - ` into `[baseTitle, flavorLabel]`
    - If title contains `(...)` at the end, treat the last parentheses as `flavorLabel`
  - Fallback: `baseTitle = title`, `flavorLabel = null` (chip hidden)
- **Action targeting:** quick view / wishlist / details / add-to-cart must always operate on the **active variant**.

## File map (units + responsibilities)

- **Modify** `src/services/product.service.ts`
  - Include `parentUid` in `productCardSelect` so listings can group.
- **Create** `src/lib/product-grouping.ts`
  - Pure helpers: group-by-`parentUid`, pick default variant, compute “base title” + “flavor label”.
- **Create** `src/components/site/grouped-product-card.tsx`
  - Client component that renders a card for a group and manages selected variant state; delegates visuals to existing patterns (image/price/buttons) and adds flavor selector UI.
- **Modify** listing pages to use grouped rendering:
  - `src/app/(site)/catalog/page.tsx`
  - `src/app/(site)/catalog/[categorySlug]/page.tsx`
  - `src/components/site/product-page-content.tsx` (related products section)

## Task 1: Add `parentUid` to listing payloads

**Files:**
- Modify: `src/services/product.service.ts`

- [ ] **Step 1: Update `productCardSelect` to include `parentUid`**
- [ ] **Step 2: Ensure TypeScript compiles for listing consumers**
- [ ] **Step 3: Quick sanity check by running `npm test` (known unrelated failures may exist)**

## Task 2: Add grouping helper utilities

**Files:**
- Create: `src/lib/product-grouping.ts`

- [ ] **Step 1: Implement types for “variant” (subset of product card fields + `parentUid`)**
- [ ] **Step 2: Implement `groupProductsForListing(items)`**
  - Output items of shape:
    - `{ kind: 'single', product }`
    - `{ kind: 'group', parentUid, variants, defaultVariantId, baseTitle, flavorOptions }`
  - `flavorOptions` shape:
    - `{ id, label, isAvailable }[]` (label derived from `title` heuristic)
- [ ] **Step 3: Implement `pickDefaultVariant(variants)`**
  - Prefer available: `(quantity == null || quantity > 0 || isPreorderEnabled)`
  - Else stable fallback by `title` asc
- [ ] **Step 4: Implement `getBaseTitleAndFlavorLabel(title)`**
  - Returns `{ baseTitle, flavorLabel }`
  - Uses the heuristics from “Decisions & assumptions”

## Task 3: Implement `GroupedProductCard` client component

**Files:**
- Create: `src/components/site/grouped-product-card.tsx`
- (May reuse) `src/components/site/product-card.tsx` (as reference for styling + layout)

- [ ] **Step 1: Define props**
  - `variants: Variant[]`
  - `priority?: boolean`
- [ ] **Step 2: Local state**
  - `selectedId` / `activeVariant`
  - initialize via `pickDefaultVariant`
- [ ] **Step 3: Render**
  - Use the existing card visuals (same button components) but bind to `activeVariant` fields:
    - image `photo`, `blurDataURL` (if available)
    - title = `baseTitle` (`line-clamp-2`)
    - flavor chip = active option label (`line-clamp-1`, hide if `null`)
    - add-to-cart uses `activeVariant.id`
    - details link uses `activeVariant.slug` (fallback by id route)
    - quick view + wishlist must also target `activeVariant.id`
- [ ] **Step 4: Flavor selector UI**
  - If variants <= 6: render compact buttons (pills) with short labels
  - Else: render “Вкусы” button with an accessible popover (Radix/shadcn Popover or existing project primitive)
  - On select: update local state; do not change URL
- [ ] **Step 5: Out of stock handling**
  - disable add-to-cart if `quantity != null && quantity <= 0 && !isPreorderEnabled`

## Task 4: Wire grouping into catalog page

**Files:**
- Modify: `src/app/(site)/catalog/page.tsx`
- Create/Modify: `src/components/site/grouped-product-card.tsx` (if needed)

- [ ] **Step 1: Group `products` from `productService.getCatalogProducts`**
- [ ] **Step 2: Render**
  - for `single`: existing `ProductCard`
  - for `group`: `GroupedProductCard`
  - preserve existing `priority={index < 2}` logic for first visible items (apply to grouped card based on group position)

## Task 5: Wire grouping into category page

**Files:**
- Modify: `src/app/(site)/catalog/[categorySlug]/page.tsx`

- [ ] **Step 1: Group `products` array prior to mapping**
- [ ] **Step 2: Render grouped/single similarly to catalog page**

## Task 6: Wire grouping into related products on PDP

**Files:**
- Modify: `src/components/site/product-page-content.tsx`

- [ ] **Step 1: Group `relatedProducts` prior to mapping**
- [ ] **Step 2: Render grouped/single cards**

## Task 7: Validate behavior manually

- [ ] **Step 0: Add automated checks (fast confidence)**
  - Unit tests for `groupProductsForListing` + `pickDefaultVariant` + `getBaseTitleAndFlavorLabel`
  - Component test for `GroupedProductCard`: selection swaps price + add-to-cart target
  - Run: `npm run lint`
  - Run: `npm run build`
  - Run: `npm test` (note: repo may currently have unrelated failing tests; focus on new/related ones)
- [ ] **Step 1: Open catalog with a known `parentUid` group**
  - Expect: one card for group
  - Expect: selecting flavor swaps photo/price and add-to-cart adds correct variant
- [ ] **Step 2: Open category listing with same group**
- [ ] **Step 3: Open a product page and verify related products grouping**

