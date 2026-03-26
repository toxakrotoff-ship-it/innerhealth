# Catalog: Grouped flavor variants in product cards (design)

Date: 2026-03-26  
Project: Inner Health (Next.js App Router)

## Problem

Some products exist in the database as separate SKUs/rows (different `productId`) that are effectively the same product with different flavors. In the catalog grid this creates duplicates and wastes space. We want to **group** these variants into **one catalog card** with a flavor selector that swaps the visible photo and changes what gets added to cart.

Constraints:
- Variants are **separate products** in DB and must remain separate in cart/orders/stock/SKU.
- Selecting a flavor must update **photo + price + availability + “Add to cart” target**.

## Glossary

- **Variant**: a real Product row in DB with its own `id` (used as `productId` in cart).
- **Group**: a set of variants that should render as one card in listings.

## Grouping rule (recommended)

Use the existing DB field:
- Group key = `parentUid`.
- All products with the same non-null `parentUid` belong to one group.
- If `parentUid` is null/empty: product renders as a normal single-product card.

## Default variant selection

When rendering a group card, pick the initial selected variant:
- Prefer the first variant that is **available** (quantity > 0 OR `isPreorderEnabled`), otherwise
- Fallback to the first variant by stable ordering (e.g. `title` ASC, or `createdAt` ASC).

## Card behavior (group card)

The group card is a wrapper around the existing visual style, but its dynamic fields come from the **selected variant**:
- **Photo**: show only the selected variant’s `photo` (or first gallery photo if used).
- **Title**: show a **base title** (without flavor) using `line-clamp-2`.
- **Flavor label**: show selected flavor as a **chip** (1 line, clamped) separate from title.
- **Price/old price/discount price**: from selected variant.
- **Availability**: from selected variant (`quantity`, `isPreorderEnabled`).
- **Wishlist / quick view / details**: operate on the selected variant’s `id` and `slug`.
- **Add to cart**: adds the selected variant’s `productId`.

Selection state is local to the card (no URL state, no global persistence required).

## Flavor selector (UX)

Placement:
- Under the product image OR in the top-right overlay area (near quick view / wishlist).

Interaction:
- Display 3–6 variants as compact pills/dots with short labels.
- For larger groups: show a “Flavors” trigger that opens a small popover list.

On selection:
- Update selected variant state.
- Re-render photo, flavor chip, price, availability, and action targets.

Out of stock:
- If selected variant is unavailable: disable “Add to cart” with “Товар закончился”.
- Other flavors remain selectable.

## Handling long names

Primary approach:
- Split “base name” and “flavor” so that flavor does not consume title space.
- Keep base name clamped to 2 lines.
- Render flavor as separate chip (clamped to 1 line).

Optional improvements:
- Move volume/form factors (e.g. “250 г”, “60 капсул”) into the secondary meta line (brand/SKU-style) to keep title short.
- Ensure card layout height stays stable between variants (avoid layout shift when swapping text).

## Success criteria

- Catalog listing shows **one card per group** instead of duplicated flavor products.
- Selecting a flavor changes:
  - photo
  - price/old price (if any)
  - availability state
  - `productId` used for “Add to cart”
- Long titles remain readable on mobile (no awkward overflow).

