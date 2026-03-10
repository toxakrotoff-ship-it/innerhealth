# InnerHealth.ru — Storefront/Checkout Roadmap (90% of Client TZ)

Date: 2026-02-26  
Project: InnerHealth.ru (niche e-commerce, up to ~100 products)  
Stack: Next.js (App Router), Prisma (PostgreSQL), Tailwind, shadcn/ui  

## Scope & explicit constraints (agreed)

- **Variants**: NOT implemented as a dedicated “variant mechanics” (no configurable PDP variants).
  - If “volume/packaging” differs, it is **a separate Product** (as-is from Tilda).
- **Delivery providers**: keep **SDEK + Pickup only** for now. No Russian Post / Boxberry in this phase.
- **Payments**: keep **YooKassa as-is** for now.
- **Goal**: bring the project to **~90% of the requested UX/TZ** within the above constraints.

## Current state (audit highlights)

### What already exists

- **Catalog**: RSC pages with ISR, category pages and product cards.
  - `src/app/(site)/catalog/page.tsx`
  - `src/app/(site)/catalog/[categorySlug]/page.tsx`
- **PDP**: basic product page, “Add to cart”.
  - `src/app/(site)/product/[slug]/page.tsx`
  - `src/components/site/product-page-content.tsx`
- **Cart + checkout**:
  - Client cart in localStorage: `src/store/cart-store.ts`
  - Checkout UI and totals, promo logic replicated client+server:
    - `src/components/site/cart-page-content.tsx`
    - `src/app/api/orders/route.ts` (server recalculation)
  - **Promo codes** with critical rule (do not apply to “already discounted” items) implemented server-side:
    - `src/app/api/promo/validate/route.ts`
    - `prisma/schema.prisma` has `discountPrice`, `isPromoEligible`, `priceOld`
  - **SDEK** calculator + PVZ search + shipment creation after payment:
    - `src/app/api/cdek/*`
    - `src/lib/cdek.ts`
  - **YooKassa** payment + webhook:
    - `src/lib/yookassa.ts`
    - `src/app/api/webhooks/yookassa/route.ts`
- **SEO basics**:
  - `src/app/sitemap.ts`
  - `src/app/robots.ts`
- **Admin**: products, categories, promo codes, orders, users/roles, reviews moderation, redirects, settings, etc.

### What is missing vs TZ (summary)

- Catalog: **multi-level categories**, **search + autosuggest**, **filters**, **sorting**, **grid/list toggle**, **quick view**, **compare**, **recently viewed**
- PDP: **gallery with zoom**, **stock status**, **wishlist**, **1-click buy**, **related products**, **reviews+rating per product**, **Q&A**
- Checkout: **terms checkbox**, **file upload** (magic numbers), **order comment field** (separate from address), “auth by email/phone” for customers (customer portal)
- Customer portal: profile, addresses, order history, tracking, wishlist, viewed products, subscriptions
- Security constraints: move user mutations to **Server Actions** where feasible; magic bytes validation; robust rate limits (Redis for prod)

## Target architecture (for this roadmap)

- **Layering**
  - UI: `src/components/**` (minimize `'use client'`)
  - DAL/services: `src/services/**` and/or `src/lib/**`
  - API routes: thin wrappers for integrations (YooKassa webhooks, SDEK calls) and legacy compatibility
- **Data validation**
  - Zod at all user input boundaries (Server Actions + API routes)
- **State**
  - Keep cart in localStorage for now (already works) **but** ensure all monetary calculations are verified on the server (already done for order creation).
  - For compare/viewed/wishlist (guest): localStorage.
  - For authenticated customer portal: DB-backed lists.

## Roadmap overview (phased)

### Phase 1 — Catalog UX (high impact, minimal data model changes)

**Outcome**: searchable, filterable catalog; quick view; compare; recently viewed.

#### 1.1. Multi-level categories (data + navigation)

Option A (recommended): adjacency list in Prisma.
- Add `Category.parentId` (nullable) and `Category.children` relation
- Update admin categories UI: parent selector, tree view
- Update storefront: category navigation tree + breadcrumbs

#### 1.2. Search + autosuggest (name + SKU)

- Add endpoint or Server Action: `searchProducts(q)` and `suggestProducts(q)`
- For Postgres:
  - Use `ILIKE` for MVP (100 products)
  - Optionally add `pg_trgm` later for better fuzzy matching

#### 1.3. Filters + sorting

MVP filters:
- price range (min/max)
- brand (from `Product.brand`)
- basic attributes (see Phase 2 decision; can start with existing “characteristics*” fields, then normalize)

Sorting:
- price asc/desc
- newest (createdAt desc)
- name (title asc)
- popularity (Phase 2: can be proxied by “sales count” from OrderItems)

#### 1.4. Grid/List toggle

- Implement as URL param via `nuqs` (project convention)
- Reuse ProductCard for grid; build a compact row component for list view

#### 1.5. Quick view (Dialog)

- Add product quick view modal:
  - minimal: images (or primary), title, price, add-to-cart, link to PDP
- Implementation approach:
  - Option 1: client-side fetch product summary by id
  - Option 2: intercepting routes for SEO-friendly deep link (later)

#### 1.6. Compare 2+ products

- localStorage-based compare list
- compare page `/compare`: table of key characteristics (start with price, brand, main characteristics fields)

#### 1.7. Recently viewed

- localStorage list of last N product IDs/slug
- show blocks on PDP and/or cart page

### Phase 2 — PDP conversion features

**Outcome**: richer product page that converts.

- Gallery:
  - Use `Product.photos` (Json) + lightbox + zoom
- Stock status:
  - Based on `Product.quantity`
  - Define thresholds: e.g. `>= 10` “In stock”, `1..9` “Low”, `null` “Preorder”
- Related products:
  - MVP: same categories
  - Later: co-purchase suggestions from `OrderItem`
- Wishlist:
  - MVP: localStorage
  - Later: DB-backed per user
- Buy in 1 click:
  - Minimal “short order” form: phone + name (optional) + product id + qty
- Reviews + rating per product:
  - Extend schema: `ProductReview` with `productId`, `rating`, `text`, `status`
  - Allow only verified purchasers to review (Phase 4: portal)
- Q&A:
  - Extend schema: `ProductQuestion` (with admin answer)

### Phase 3 — Checkout hardening (within SDEK + pickup)

**Outcome**: compliance + security for checkout.

- Separate order fields:
  - `order.comment` (do not embed into address)
  - `order.deliveryMethod` already exists in `ShippingInfo` (keep)
- Terms checkbox:
  - Required boolean in the checkout payload
  - Validate via Zod on the server (order creation)
- File attachment:
  - Upload API/Server Action with:
    - allowlist: images and PDF
    - max size: 5MB
    - **magic bytes** validation
  - Storage decision:
    - MVP: server filesystem (non-public) + signed download for admins
    - Better: S3-compatible storage
- Rate limiting:
  - keep for promo/order (exists)
  - move to Redis for multi-instance production (Upstash suggested in code)

### Phase 4 — Customer portal (minimum viable)

**Outcome**: account, orders, wishlist/viewed sync, tracking.

- Authentication:
  - Extend NextAuth to support customers (email-based login link or code, or phone OTP)
  - NOTE: requires an SMS/email provider; if not available, postpone.
- Orders history:
  - `/account/orders` list + order details
  - “Repeat order” button => re-add items to cart
- Addresses:
  - `CustomerAddress` model
- Wishlist/viewed:
  - Sync localStorage on first login
- Tracking:
  - Store tracking number on order, show status if available (SDEK first)

## Implementation sequence (recommended)

**Priority order**: catalog UX → PDP conversion → checkout compliance/security → customer portal.

Rationale:
- Most user-visible value comes from better discovery (search/filter) and PDP conversion.
- Checkout is already functional; we harden it after UX.
- Customer portal depends on auth/channel decisions (email/SMS).

## “AI prompts” — step-by-step execution checklist

Use these prompts as tasks for the coding agent. Each prompt is written to be copy-pasted into a new message.

### Prompt 0 — Baseline verification (no behavior changes)

> Audit and list current routes/components for catalog, product, cart, checkout, promo, SDEK, YooKassa. Produce a dependency map and identify where to add: search, filters, quick view, compare, recently viewed. Do not implement anything yet.

### Prompt 1 — Multi-level categories (schema + admin + storefront)

> Implement multi-level categories using adjacency list: add `Category.parentId` relation in Prisma, create migration, update admin category CRUD to support selecting a parent category and display a tree. Update storefront category navigation and breadcrumbs to reflect parent chain. Ensure Zod validation on admin inputs. Add tests or at least runtime checks for cycles.

### Prompt 2 — Catalog search by title + SKU with autosuggest

> Add catalog search with autosuggest. Requirements: debounce on client, search by `Product.title` and `Product.sku`, case-insensitive; autosuggest returns top 5-10 matches. Implement via Server Action or API route with Zod input schema. Add UI to catalog header and support `?q=` param for full results.

### Prompt 3 — Filters (price, brand, basic attributes) + sorting + URL state

> Implement catalog filters + sorting with URL state (use `nuqs`). Filters: price min/max, brand multi-select. Sorting: price asc/desc, newest, name. Ensure server-side query uses Prisma filters and returns paginated results. Keep RSC where possible; only small client components for filter controls.

### Prompt 4 — Grid/List toggle

> Add grid/list view toggle to catalog page controlled by URL param. Build a list-row component for list view while reusing existing product card for grid. Ensure good mobile layout and no CLS regressions.

### Prompt 5 — Quick view modal

> Add “Quick view” modal from product card. Modal shows main image/gallery preview, title, price, short description, add-to-cart, and link to PDP. Implement with shadcn Dialog. Keep data fetching efficient (only summary fields).

### Prompt 6 — Compare products

> Implement compare feature. Store compare list in localStorage. Add “Compare” toggle on product cards and PDP. Create `/compare` page rendering a comparison table: price, brand, SKU, and a small set of characteristics. Limit to 2–6 items; show validation messaging.

### Prompt 7 — Recently viewed

> Implement recently viewed products: track viewed product IDs in localStorage (max 20, dedupe). Add block “Recently viewed” on PDP and optionally on cart. Fetch product cards data by ids server-side (or via a small endpoint).

    ### Prompt 8 — PDP gallery + zoom + stock status

> Upgrade PDP media: use `Product.photos` JSON array (fallback to `photo`), implement gallery with thumbnails and zoom/lightbox. Add stock status UI based on `quantity`: in stock / low / preorder. Ensure images use Next/Image with correct `sizes` and blur placeholders if available.

### Prompt 9 — Related products

> Add “Related products” and “Bought together” blocks on PDP. MVP: same category products excluding current. Later: co-purchase based on OrderItem aggregation. Keep server-side data fetching.

### Prompt 10 — Wishlist (MVP localStorage)

> Add wishlist with localStorage. Add heart button on cards and PDP. Add `/wishlist` page. Show empty state and allow remove. No auth sync yet.

### Prompt 11 — 1-click buy (short order)

> Implement “Buy in 1 click” on PDP: Dialog form (name + phone + optional comment). Create minimal server endpoint/Server Action with Zod validation and rate limiting. Store as a separate DB entity (e.g. `QuickOrder`) or as `Order` with a distinct status. Add admin view for quick orders.

    ### Prompt 12 — Checkout compliance: terms checkbox + comment field

> Add required “I agree with public offer” checkbox to checkout. Validate boolean on server with Zod in order creation. Add dedicated order comment field stored in DB (do not mix into address). Update admin orders view to display comment separately.

### Prompt 13 — File attachment to order (secure uploads)

> Implement secure file upload for checkout attachment. Constraints: allow only images and PDFs, max 5MB, validate magic bytes, store outside public folder, reference file in order record. Add admin ability to download. Add rate limit for upload.

### Prompt 14 — Customer portal (optional; depends on auth channel)

> Implement minimal customer portal: `/account/orders` list + order detail + “repeat order”. Decide auth method (email magic link or phone OTP). If no provider available, stub auth and build portal UI behind feature flag.

## Acceptance checklist (for “90% done”)

- Catalog:
  - search (title+sku) + autosuggest
  - filters: price + brand + at least one attribute family
  - sorting: price/new/name (+ popularity if feasible)
  - grid/list switch
  - quick view
  - compare
  - recently viewed
- PDP:
  - gallery + zoom
  - stock status
  - related products
  - wishlist
  - 1-click buy
- Checkout:
  - promo rules preserved
  - SDEK + pickup still work
  - terms checkbox (server validated)
  - separate comment
  - secure attachment upload (magic bytes)

## Notes / risks

- “Auth by email/phone for customers” requires external providers (SMTP/SMS). This doc keeps it as Phase 4.
- “Server Actions for all mutations” conflicts with a purely localStorage cart. For 90% scope, keep the cart local but validate totals on server (already done). If strict compliance is needed, introduce server-side cart later.

