# Roadmap Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Статус:** Блоки 1–5 реализованы (см. [STATUS.md](../STATUS.md)). Остаётся Block 6: NextAuth v5 + 2FA. В проекте middleware реализован в `nextjs-project/src/proxy.ts` (не `middleware.ts`).

**Goal:** Implement the six roadmap items in recommended order: secret admin path, SEO in product form, inline edit price/quantity, product gallery with D&D, promo rules A/B/C in cart and orders, NextAuth v5 + 2FA.

**Architecture:** Each block is self-contained; admin basePath is introduced first and used in later tasks. Schema changes (Product.photos, Product.discountPrice/isPromoEligible) are done with Prisma migrations. Auth upgrade is last to avoid breaking the rest.

**Tech Stack:** Next.js 16 App Router, Prisma, NextAuth v4→v5, Tailwind, @dnd-kit (sortable), otplib (2FA).

---

## Block 1: Секретный путь админки (ADMIN_SECRET_PATH)

### Task 1.1: Middleware matcher and rewrite

**Files:**
- Modify: `nextjs-project/src/proxy.ts` (в проекте middleware в proxy.ts)

**Step 1:** Build matcher from env and add rewrite for custom path.

In `proxy.ts`:
- After `const adminSecretPath = process.env.ADMIN_SECRET_PATH || 'admin'`, define `matcherPaths`: array that includes `/${adminSecretPath}/:path*`, `/admin/:path*`, and the rest of current matcher entries (api/admin, api/orders, etc.). Export `config.matcher` as `matcherPaths`.
- In the middleware function (inside `withAuth`), before `addSecurityHeaders`: get `pathname` from `request.url`. If `pathname.startsWith(\`/\${adminSecretPath}\`)` and `adminSecretPath !== 'admin'`, create rewrite URL: path = `/admin` + pathname.slice(adminSecretPath.length) or `/admin` if pathname is exactly `/${adminSecretPath}`. Use `NextResponse.rewrite(new URL(rewritePath, request.url))`, then apply `addSecurityHeaders` to that response and return it. Otherwise call `NextResponse.next()` and add security headers as now.

**Step 2:** Verify.

Run: `cd nextjs-project && npm run build`
Expected: build succeeds. No TypeScript errors in middleware.

**Step 3:** Commit.

```bash
git add nextjs-project/src/proxy.ts
git commit -m "feat(admin): matcher and rewrite for ADMIN_SECRET_PATH"
```

---

### Task 1.2: Admin basePath from layout and context

**Files:**
- Create: `nextjs-project/src/app/admin/context/admin-base-path.tsx`
- Modify: `nextjs-project/src/app/admin/layout.tsx`
- Modify: `nextjs-project/src/app/admin/components/AdminLayoutClient.tsx`

**Step 1:** Create context and hook.

Create `nextjs-project/src/app/admin/context/admin-base-path.tsx`:
- Export `AdminBasePathContext` (React.createContext<string>('admin')).
- Export `AdminBasePathProvider` with value `process.env.ADMIN_SECRET_PATH || 'admin'` (use a prop passed from server, not direct env read in client).
- Export `useAdminBasePath(): string` that returns `useContext(AdminBasePathContext)`.

**Step 2:** Pass basePath from layout to client.

In `layout.tsx`: compute `const adminBasePath = process.env.ADMIN_SECRET_PATH || 'admin'`. Wrap children with a provider that passes `adminBasePath` (or render `AdminLayoutClient` with `adminBasePath={adminBasePath}` and let client provide context). Prefer passing as prop into `AdminLayoutClient` and having `AdminLayoutClient` render `AdminBasePathProvider value={adminBasePath}` around its children.

**Step 3:** Use provider in AdminLayoutClient.

In `AdminLayoutClient`: accept prop `adminBasePath: string`; wrap content in `AdminBasePathProvider value={adminBasePath}` (if you created a provider that takes value). If context is in a separate file, ensure layout passes `adminBasePath` and AdminLayoutClient renders the provider with that value.

**Step 4:** Commit.

```bash
git add nextjs-project/src/app/admin/context/admin-base-path.tsx nextjs-project/src/app/admin/layout.tsx nextjs-project/src/app/admin/components/AdminLayoutClient.tsx
git commit -m "feat(admin): add AdminBasePath context and pass from layout"
```

---

### Task 1.3: AdminNav links use basePath

**Files:**
- Modify: `nextjs-project/src/app/admin/components/AdminNav.tsx`

**Step 1:** Use `useAdminBasePath()` and prefix all admin hrefs.

In `AdminNav.tsx`: call `const base = useAdminBasePath()`. Replace every `href: '/admin/...'` with `href: \`/\${base}/...\`` (e.g. `/admin/catalog` → `${base}/catalog`). Keep query params (e.g. `?type=article`) as is. Adjust `pathname` checks for active state: use `pathname.startsWith(\`/\${base}\`)` and strip base when comparing to item href.

**Step 2:** Commit.

```bash
git add nextjs-project/src/app/admin/components/AdminNav.tsx
git commit -m "feat(admin): AdminNav links use admin base path"
```

---

### Task 1.4: Remaining admin links use basePath

**Files:**
- Modify: `nextjs-project/src/app/admin/page.tsx`
- Modify: `nextjs-project/src/app/admin/catalog/page.tsx`
- Modify: `nextjs-project/src/app/admin/catalog/components/ProductTable.tsx`
- Modify: `nextjs-project/src/app/admin/catalog/components/CategorySidebar.tsx`
- Modify: `nextjs-project/src/app/admin/products/[id]/edit/EditProductForm.tsx`
- Modify: `nextjs-project/src/app/admin/products/[id]/ViewProductPageClient.tsx`
- Modify: `nextjs-project/src/app/admin/products/new/page.tsx`
- Modify: `nextjs-project/src/app/admin/news/page.tsx`
- Modify: `nextjs-project/src/app/admin/news/edit/[id]/EditNewsPageClient.tsx`
- Modify: `nextjs-project/src/app/admin/news/new/page.tsx`
- Modify: `nextjs-project/src/app/admin/components/ProfileMenu.tsx`

**Step 1:** Replace hardcoded `/admin` with basePath in each file.

In each file: use `useAdminBasePath()` (in client components) or receive basePath via props where needed. Replace:
- `router.push('/admin/...')` → `router.push(\`/\${base}/\...\`)`
- `href="/admin/..."` → `href={\`/\${base}/...\`}`
- `Link href="/admin/..."` → `Link href={\`/\${base}/...\`}`

Do not change `/api/admin/...` fetch URLs (API paths stay as is).

**Step 2:** Commit.

```bash
git add nextjs-project/src/app/admin/
git commit -m "feat(admin): all admin links use base path"
```

---

## Block 2: SEO в форме товара

### Task 2.1: SEO fields in EditProductForm

**Files:**
- Modify: `nextjs-project/src/app/admin/products/[id]/edit/EditProductForm.tsx`

**Step 1:** Add SEO to form state and load.

In `EditProductForm.tsx`: add to `formData` state: `seoTitle: '', seoDescr: '', seoKeywords: ''`. In `fetchProduct` when setting `setFormData`, add `seoTitle: data.seoTitle ?? '', seoDescr: data.seoDescr ?? '', seoKeywords: data.seoKeywords ?? ''`. In the form JSX, add a section "SEO" with:
- label "SEO заголовок", input name="seoTitle", value/onChange
- label "SEO описание", textarea name="seoDescr"
- label "SEO ключевые слова", input name="seoKeywords"

Include these in `handleChange` (or separate handlers) and in the PUT body in `handleSubmit`.

**Step 2:** Commit.

```bash
git add nextjs-project/src/app/admin/products/[id]/edit/EditProductForm.tsx
git commit -m "feat(admin): add SEO block to product edit form"
```

---

### Task 2.2: SEO fields in new product form

**Files:**
- Modify: `nextjs-project/src/app/admin/products/new/page.tsx`

**Step 1:** Add SEO fields to create form.

In the new product page: add state and inputs for `seoTitle`, `seoDescr`, `seoKeywords`; include them in the POST body when creating the product. Reuse same structure as in EditProductForm (section "SEO" with three fields).

**Step 2:** Commit.

```bash
git add nextjs-project/src/app/admin/products/new/page.tsx
git commit -m "feat(admin): add SEO block to new product form"
```

---

## Block 3: Инлайн-редактирование цены и остатка

### Task 3.1: PATCH endpoint for product partial update

**Files:**
- Modify: `nextjs-project/src/app/api/admin/products/route.ts`

**Step 1:** Add PATCH handler.

In the route file, add `export async function PATCH(request: Request)`. Parse JSON body: `{ id: string, price?: number, quantity?: number }`. Validate: id required; if price provided, must be >= 0; if quantity provided, must be integer >= 0. Get session; if !session return 401. Run `prisma.product.update({ where: { id }, data: { ...(price !== undefined && { price }), ...(quantity !== undefined && { quantity }) } })`. Return updated product or 404 if not found.

**Step 2:** Test manually or add minimal integration check.

Run: `cd nextjs-project && npm run build`
Expected: build succeeds.

**Step 3:** Commit.

```bash
git add nextjs-project/src/app/api/admin/products/route.ts
git commit -m "feat(admin): PATCH products for price and quantity"
```

---

### Task 3.2: ProductTable inline edit for price and quantity

**Files:**
- Modify: `nextjs-project/src/app/admin/catalog/components/ProductTable.tsx`

**Step 1:** Add quantity column and inline edit UI.

In ProductTable:
- Add table header "Остаток" (e.g. after "Цена").
- In table body, for each product: show quantity in a cell (or "—" if null).
- For "Цена" and "Остаток" cells: show text by default; on double-click (or a small "Изм." control) switch to an input. On blur or Enter, call PATCH with `{ id: product.id, price }` or `{ id: product.id, quantity }`. On success, call `onRefresh()`. Optionally show a short loading state per row.
- Ensure "Ред." link uses basePath: `href={\`/\${base}/products/${product.id}/edit\`}` (get base from useAdminBasePath()).

**Step 2:** Commit.

```bash
git add nextjs-project/src/app/admin/catalog/components/ProductTable.tsx
git commit -m "feat(admin): inline edit price and quantity in catalog table"
```

---

## Block 4: Галерея изображений с D&D

### Task 4.1: Product.photos and migration

**Files:**
- Modify: `nextjs-project/prisma/schema.prisma`
- Create: migration

**Step 1:** Add photos to Product.

In `schema.prisma`, add to model Product: `photos Json?` (comment: ordered list of image URLs). Run: `cd nextjs-project && npx prisma migrate dev --name add_product_photos`
Expected: migration created and applied.

**Step 2:** Optional backfill: set photos = [photo] where photo is not null (can be a separate data migration or SQL in migration). If skipped, handle in app: when reading, if photos is null/empty use [photo] if photo set.

**Step 3:** Commit.

```bash
git add nextjs-project/prisma/
git commit -m "feat(schema): add Product.photos for gallery"
```

---

### Task 4.2: API accept and return photos

**Files:**
- Modify: `nextjs-project/src/app/api/admin/products/route.ts`

**Step 1:** Whitelist photos in PUT/POST and sync photo.

In GET (single product): ensure `photos` is selected (Prisma returns it by default). In PUT: add `photos` to allowed fields; if `photos` is array of strings, write to DB; set `photo = photos?.[0] ?? null` when updating. In POST: same for create. Validate photos: must be array of strings if present.

**Step 2:** Commit.

```bash
git add nextjs-project/src/app/api/admin/products/route.ts
git commit -m "feat(api): products accept and return photos array"
```

---

### Task 4.3: Gallery component with D&D in product form

**Files:**
- Create: `nextjs-project/src/app/admin/products/components/ProductGalleryEditor.tsx`
- Modify: `nextjs-project/src/app/admin/products/[id]/edit/EditProductForm.tsx`

**Step 1:** Install DnD library.

Run: `cd nextjs-project && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Expected: packages installed.

**Step 2:** Implement ProductGalleryEditor.

Create component that: receives `photos: string[]` and `onChange: (photos: string[]) => void`. Renders sortable list (use @dnd-kit/sortable). Each item: thumbnail, optional URL input, delete button. Add button "Добавить фото" (append empty or open upload). On reorder, call onChange with new order. Use drag handle on each row.

**Step 3:** Integrate in EditProductForm.

In form state: replace or complement `photo` with `photos: string[]` (from product.photos ?? (product.photo ? [product.photo] : [])). Render ProductGalleryEditor; on change update state. On submit, send `photos` and set `photo` to photos[0] for compatibility if API expects it.

**Step 4:** Commit.

```bash
git add nextjs-project/src/app/admin/products/components/ProductGalleryEditor.tsx nextjs-project/src/app/admin/products/[id]/edit/EditProductForm.tsx nextjs-project/package.json nextjs-project/package-lock.json
git commit -m "feat(admin): product gallery with drag-and-drop"
```

---

### Task 4.4: New product form gallery and product card display

**Files:**
- Modify: `nextjs-project/src/app/admin/products/new/page.tsx`
- Modify: public product card page (if exists) to show gallery from photos

**Step 1:** Add gallery to new product form (same ProductGalleryEditor, initial empty array). On create POST send photos array.

**Step 2:** On product card page (e.g. product/[slug] or product/id/[id]): fetch product with photos; display gallery (first image as main, rest in thumbnails or carousel). Fallback to single `photo` if photos empty.

**Step 3:** Commit.

```bash
git add nextjs-project/src/app/admin/products/new/page.tsx nextjs-project/src/app/(site)/product/...
git commit -m "feat: gallery in new product form and product card"
```

---

## Block 5: Правила промокодов и корзина

### Task 5.1: Product.discountPrice and isPromoEligible

**Files:**
- Modify: `nextjs-project/prisma/schema.prisma`
- Migration

**Step 1:** Add fields to Product.

In schema: `discountPrice Float?` (comment: if set, item is on sale; promo not applied), `isPromoEligible Boolean @default(true)`. Run: `cd nextjs-project && npx prisma migrate dev --name add_promo_eligibility`
Expected: migration applied.

**Step 2:** Commit.

```bash
git add nextjs-project/prisma/
git commit -m "feat(schema): Product.discountPrice and isPromoEligible"
```

---

### Task 5.2: Product form and API for discountPrice and isPromoEligible

**Files:**
- Modify: `nextjs-project/src/app/api/admin/products/route.ts`
- Modify: `nextjs-project/src/app/admin/products/[id]/edit/EditProductForm.tsx`
- Modify: `nextjs-project/src/app/admin/products/new/page.tsx`

**Step 1:** API: add `discountPrice`, `isPromoEligible` to allowed fields in GET/PUT/POST. In PUT/POST accept and persist them.

**Step 2:** Edit form: add "Акционная цена" (number input), "Участвует в промокодах" (checkbox). Load/save in formData and submit.

**Step 3:** New product form: same two fields.

**Step 4:** Commit.

```bash
git add nextjs-project/src/app/api/admin/products/route.ts nextjs-project/src/app/admin/products/
git commit -m "feat(admin): product form and API for discountPrice and isPromoEligible"
```

---

### Task 5.3: Cart and orders apply Rules A/B/C

**Files:**
- Modify: `nextjs-project/src/store/cart-store.ts`
- Modify: `nextjs-project/src/components/site/cart-page-content.tsx`
- Modify: `nextjs-project/src/app/api/orders/route.ts`
- Modify: places that add to cart (product page / card) to pass isPromoEligible and hasPromoPrice

**Step 1:** CartLine: add `isPromoEligible?: boolean`. When adding to cart, set `hasPromoPrice` = (discountPrice != null || (priceOld != null && priceOld > price)); set `isPromoEligible` from product.

**Step 2:** cart-page-content: subtotalRegular = sum over items where !hasPromoPrice && isPromoEligible; subtotalPromoPrice = rest. Apply promo only to subtotalRegular. Total = subtotalPromoPrice + discounted(subtotalRegular).

**Step 3:** orders route: when loading products include discountPrice, isPromoEligible. Split line totals into "promo-eligible regular" vs "sale or ineligible"; apply promo only to first; sum and set order total. Save promoCodeId on order as now.

**Step 4:** Where add to cart is called: ensure product payload includes discountPrice, isPromoEligible (and priceOld) so cart store can set hasPromoPrice and isPromoEligible.

**Step 5:** Commit.

```bash
git add nextjs-project/src/store/cart-store.ts nextjs-project/src/components/site/cart-page-content.tsx nextjs-project/src/app/api/orders/route.ts nextjs-project/src/app/...
git commit -m "feat(cart): apply promo rules A/B/C in cart and orders"
```

---

## Block 6: NextAuth v5 и 2FA

### Task 6.1: Upgrade to NextAuth v5

**Files:**
- Modify: `nextjs-project/package.json`
- Create/Modify: `nextjs-project/src/auth.ts` (or auth.config.ts + auth.ts per v5 docs)
- Modify: `nextjs-project/src/app/api/auth/[...nextauth]/route.ts`
- Modify: `nextjs-project/src/lib/auth.ts` (if exists) and all getServerSession usages
- Modify: `nextjs-project/src/proxy.ts` if auth middleware API changed

**Step 1:** Install NextAuth v5.

Run: `cd nextjs-project && npm install next-auth@beta` (or stable v5 when available). Check migration guide: https://authjs.dev/getting-started/migration

**Step 2:** Create auth config and route.

v5 uses `Auth()` and export from route `handlers`. Replace existing NextAuth options with v5 config (credentials provider, JWT callbacks, session callback). Keep same env vars (NEXTAUTH_SECRET, etc.). Update route to export GET/POST from the v5 handlers.

**Step 3:** Replace getServerSession.

v5: `import { auth } from '@/auth'` and use `auth()` or getSession(). Replace every `getServerSession(authOptions)` with the new API. Update middleware to use v5's withAuth if API changed.

**Step 4:** Run build and fix any type or runtime errors.

Run: `cd nextjs-project && npm run build`
Expected: build succeeds; login and admin access work.

**Step 5:** Commit.

```bash
git add nextjs-project/
git commit -m "feat(auth): upgrade to NextAuth v5"
```

---

### Task 6.2: User model and migration for 2FA

**Files:**
- Modify: `nextjs-project/prisma/schema.prisma`
- Migration

**Step 1:** Add 2FA fields to User.

`totpSecretEncrypted String?`, `totpEnabled Boolean @default(false)`. Optionally `backupCodesHash String?` if storing hashed backup codes. Run: `npx prisma migrate dev --name add_user_2fa`

**Step 2:** Commit.

```bash
git add nextjs-project/prisma/
git commit -m "feat(schema): User 2FA fields"
```

---

### Task 6.3: TOTP setup and verify flow

**Files:**
- Create: `nextjs-project/src/lib/totp.ts`
- Create: `nextjs-project/src/app/api/auth/totp/setup/route.ts`
- Create: `nextjs-project/src/app/api/auth/totp/verify/route.ts`
- Modify: login flow to check totpEnabled and redirect to 2FA step
- Create: 2FA challenge page (e.g. login/verify-2fa or step in login page)

**Step 1:** Install otplib and qrcode (for QR).

Run: `cd nextjs-project && npm install otplib qrcode && npm install -D @types/qrcode`

**Step 2:** totp.ts: generateSecret(), verifyToken(secret, token), encrypt/decrypt secret with NEXTAUTH_SECRET or dedicated key.

**Step 3:** POST totp/setup: require session; generate secret; encrypt and save to user; return { secret, qrUrl } for display. Client shows QR and backup codes; user confirms with first token.

**Step 4:** POST totp/verify: body { token }; get session; get user totpSecretEncrypted; verify token; if valid, complete login (e.g. set flag in session or redirect to admin).

**Step 5:** Login flow: after credentials success, if user.totpEnabled redirect to 2FA step with session cookie; 2FA page submits token to totp/verify; on success redirect to admin.

**Step 6:** Commit.

```bash
git add nextjs-project/src/lib/totp.ts nextjs-project/src/app/api/auth/ nextjs-project/src/app/login/ nextjs-project/package.json
git commit -m "feat(auth): TOTP setup and verify API and flow"
```

---

### Task 6.4: Profile 2FA enable/disable UI

**Files:**
- Modify: `nextjs-project/src/app/admin/profile/page.tsx` (or profile client component)

**Step 1:** Add section "Двухфакторная аутентификация". If !totpEnabled: button "Включить"; on click call setup API, show QR and backup codes, then input first token to confirm and enable. If totpEnabled: show "Включена" and button "Отключить" (require password or token to disable, clear totpSecretEncrypted and set totpEnabled false).

**Step 2:** Commit.

```bash
git add nextjs-project/src/app/admin/profile/
git commit -m "feat(admin): profile 2FA enable/disable UI"
```

---

## Execution options

**Plan saved.** Two ways to run it:

1. **Subagent-driven (this session)** — one subagent per task or per block, you review between steps and iterate quickly.
2. **Parallel session** — open a new session in the same repo, use the executing-plans skill there, run by blocks with checkpoints.

Which do you prefer?

If you choose subagent-driven, the next step is to invoke **subagent-driven-development** and start with Block 1 (Tasks 1.1–1.4).
