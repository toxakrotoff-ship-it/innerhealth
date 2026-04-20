# Mobile catalog cards: horizontal layout (B)

## Goal

On **mobile** catalog listings, each product card should **fit fully within the viewport** without distorting image proportions. Titles and optional metadata (SKU/flavor) must remain readable and not break layout.

## In scope

- `nextjs-project/src/components/site/product-card.tsx`
- `nextjs-project/src/components/site/grouped-product-card.tsx`
- Mobile breakpoints (`max-sm` / `<640px`) only
- Catalog listing pages:
  - `nextjs-project/src/app/(site)/catalog/page.tsx`
  - `nextjs-project/src/app/(site)/catalog/[categorySlug]/page.tsx`

## Constraints

- **No image distortion**: keep proportions; use `object-contain` on mobile image region.
- **Card fits on screen**: avoid tall, stacked layouts on mobile.
- **Text safety**:
  - Title must not overflow; clamp to a small number of lines.
  - Optional SKU/flavor label must not cause horizontal overflow.
- **Desktop/tablet unchanged**: keep current vertical card layout from `sm` and up.

## Design

### Mobile layout (recommended)

On `max-sm`, switch card container to **horizontal** layout:

- Root card content becomes `flex-row` with a fixed image column on the left and content/actions on the right.
- Image area:
  - Fixed width (responsive) and `aspect-square` (or explicit `h`/`w`) so the card height is bounded.
  - `Image` uses `fill` with `object-contain object-center`.
- Content area:
  - Title uses `line-clamp-2` and `break-words` / `overflow-wrap:anywhere` to prevent overflow.
  - SKU/flavor label uses `line-clamp-1` and `max-w-full`.
- Actions area:
  - Keep both actions visible.
  - Reduce minimum button height on `max-sm` (while respecting tap target: prefer `min-h-[40px]`).
  - Prefer stacking buttons vertically only if horizontal space is insufficient; otherwise allow side-by-side with `gap-2` and `w-full`.

### `GroupedProductCard` specifics

- Keep flavor selection, but ensure it does not inflate height:
  - Clamp/limit chips row height on mobile (wrap allowed but keep compact).
  - If needed, reduce chip font size slightly on mobile.

## Acceptance criteria

- On a common mobile viewport (e.g. 390×844), the card is **fully visible** without needing to scroll within the page to see the card’s bottom for the first row (given typical header + grid spacing).
- Image is **not stretched** (no aspect distortion).
- Title/SKU/flavor text never causes horizontal overflow; long titles are clamped.
- Layout for `sm+` matches existing appearance.

## Non-goals

- Changing product data, SEO, or listing algorithm.
- Reworking catalog grid density outside of what’s required for mobile card fit.

