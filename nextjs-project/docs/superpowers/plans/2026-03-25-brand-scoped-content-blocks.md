# Brand-scoped Content Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make content blocks strictly brand-scoped (same keys across brands) and add “Как заказать” steps to the existing “Тексты страниц” editor.

**Architecture:** Persist copy per `(brand, page, key)` in `ContentBlock`. Resolve defaults by page, then overlay persisted values for the active brand. Remove all brand scoping via `page` prefixes and key prefixes.

**Tech Stack:** Next.js App Router, TypeScript, Prisma (Postgres), Zod.

---

## File map

**Modify:**
- `nextjs-project/prisma/schema.prisma`
- `nextjs-project/src/services/content-block.service.ts`
- `nextjs-project/src/app/api/admin/content-blocks/route.ts`
- `nextjs-project/src/config/content-blocks-defaults.ts`
- `nextjs-project/src/components/site/how-to-order-steps.tsx`
- `nextjs-project/src/app/(site)/page.tsx` (or wherever `HowToOrderSteps` is wired to data)

**Create:**
- `nextjs-project/prisma/migrations/<timestamp>_content_block_brand_scope/migration.sql` (via Prisma migrate)

---

### Task 1: Add `brand` field to `ContentBlock` (Prisma)

**Files:**
- Modify: `nextjs-project/prisma/schema.prisma`

- [ ] **Step 1: Update Prisma schema**
  - Add `brand String @default("inner")` to `model ContentBlock`
  - Replace `@@unique([page, key])` with `@@unique([brand, page, key])`
  - Add `@@index([brand, page])`

- [ ] **Step 2: Create migration**
  - Run: `cd nextjs-project && npx prisma migrate dev --name content-block-brand-scope`
  - Expected: new migration folder created, Prisma client updated

- [ ] **Step 3: Review generated migration SQL**
  - Ensure ordering is safe:
    - add column brand
    - drop old unique index/constraint on `(page,key)`
    - create new unique index/constraint on `(brand,page,key)`
    - add index `(brand,page)`

- [ ] **Step 4: Adjust migration SQL for data rewrite**
  - Add SQL updates (idempotent):
    - Move page prefix into brand:
      - `UPDATE "ContentBlock" SET "brand"='sprint-power', "page"=regexp_replace("page", '^sprint-power::', '') WHERE "page" LIKE 'sprint-power::%';`
    - Key mapping for existing prefixed sprint keys with **collision-safe phases**:
      - **Phase A (temporary keys)**: rewrite targeted keys to a non-conflicting namespace:
        - `sprint.hero.title` → `__tmp__/hero.title`
        - `faq.sprint.q1` → `__tmp__/faq.q1`
      - **Phase B (dedupe)**: if both `__tmp__/X` and `X` exist for the same `(brand,page)`, keep newest by `updatedAt` and delete the older row using a window function.
      - **Phase C (finalize)**: rewrite `__tmp__/...` → canonical key without prefix.
    - Add **inventory gate**:
      - Fail-fast (or at least list) any remaining keys starting with `sprint.` or `faq.sprint.` after migration; these must be mapped or explicitly deprecated before deploy.

- [ ] **Step 5: Run `npx prisma generate` (if not already)**

- [ ] **Step 6: Commit**

---

### Task 2: Remove brand scoping via `page` prefixes in content-block service

**Files:**
- Modify: `nextjs-project/src/services/content-block.service.ts`

- [ ] **Step 1: Update types and queries**
  - Remove `getScopedPage()` and `shouldIncludeDefaultForBrand()`
  - Update `getBlocksForPage(page, brandId)`:
    - `findMany({ where: { brand: brandId, page } })`
  - Update `upsertBlocks(inputs, brandId)`:
    - Set `brand: brandId` on create/update
    - Use `where: { brand_page_key: { brand: brandId, page: input.page, key: input.key } }` (new composite unique)
  - Update `getResolvedBlocksForPage(page, brandId)`:
    - defaults filtered only by `page`
    - overlay existing `where: { brand: brandId, page }`

- [ ] **Step 2: Run typecheck/lints for the file**

- [ ] **Step 3: Commit**

---

### Task 3: Harden admin save validation for `href` keys

**Files:**
- Modify: `nextjs-project/src/app/api/admin/content-blocks/route.ts`

- [ ] **Step 1: Add a URL-path validator**
  - For blocks where `key` ends with `.href`, validate:
    - `href === href.trim()`
    - starts with `/` and not `//`
    - no whitespace/control chars
    - `new URL(href, 'https://example.invalid')` has origin `https://example.invalid`

- [ ] **Step 2: Ensure invalid href returns 400 with clear message**

- [ ] **Step 3: Commit**

---

### Task 4: Add “Как заказать” defaults and wire component to content blocks

**Files:**
- Modify: `nextjs-project/src/config/content-blocks-defaults.ts`
- Modify: `nextjs-project/src/components/site/how-to-order-steps.tsx`
- Modify: `nextjs-project/src/app/(site)/page.tsx` (or its data-loading helpers)

- [ ] **Step 1: Add defaults (page: `home`)**
  - `howToOrder.title` = “Как заказать”
  - Step 1:
    - `howToOrder.step1.title` = “Выберите товары”
    - `howToOrder.step1.text` = current text
    - `howToOrder.step1.href` = `/catalog`
    - `howToOrder.step1.linkLabel` = `В каталог`
  - Step 2:
    - `howToOrder.step2.title` = “Оформите заказ”
    - `howToOrder.step2.text` = current text
    - `howToOrder.step2.href` = `/faq`
    - `howToOrder.step2.linkLabel` = `Вопросы о доставке`
  - Step 3:
    - `howToOrder.step3.title` = “Получите и пользуйтесь”
    - `howToOrder.step3.text` = current text
    - `howToOrder.step3.href` = `/contacts`
    - `howToOrder.step3.linkLabel` = `Контакты`

- [ ] **Step 2: Make `HowToOrderSteps` accept content as props**
  - Add props:
    - `title?: string`
    - `steps?: Array<{ title: string; text: string; href: string; linkLabel: string }>`
  - Keep current defaults as fallback if props not provided (safe rollback)

- [ ] **Step 3: Load resolved blocks on home page**
  - Wherever home page already resolves content blocks, also resolve `howToOrder.*` keys and pass into `HowToOrderSteps`.
  - Use the already-resolved `brandId` used for theming (`isSprintTheme`) to resolve brand-specific values.

- [ ] **Step 4: Wire `HowToOrderSteps` on FAQ page too**
  - `HowToOrderSteps` is also embedded on `src/app/(site)/faq/page.tsx`.
  - Decide scope:
    - Preferred: reuse `home` keys for the embedded section by resolving `getResolvedBlocksForPage('home', brandId)` on the FAQ page and passing the same `howToOrder.*` values.
  - Ensure brand scoping works the same way on FAQ (no special sprint-prefixed keys).

- [ ] **Step 4: Commit**

---

### Task 5: Update runtime key usage to canonical (remove `sprint.*` and `faq.sprint.*`)

**Files:**
- Modify: `nextjs-project/src/app/(site)/page.tsx`
- Modify: `nextjs-project/src/app/(site)/faq/page.tsx`
- Modify: any shared helpers used to resolve content blocks

- [ ] **Step 1: Home (Sprint section)**
  - Replace all `sprint.*` lookups with canonical keys (`hero.*`, `hits.*`, `markers.*`, `faq.*`, etc.).
  - Ensure both brands read from the same key namespace; only values differ by brand.

- [ ] **Step 2: FAQ page**
  - Replace `faq.sprint.*` lookups with canonical `faq.*` keys.
  - Ensure FAQ page loads resolved blocks for the active brand (same keys for all brands).

- [ ] **Step 3: Commit**

---

### Task 6: Verification

- [ ] **Step 1: Run prisma checks**
  - Run: `cd nextjs-project && npx prisma validate`
  - Expected: success

- [ ] **Step 2: Run Next.js typecheck/build**
  - Run: `cd nextjs-project && npm run build`
  - Expected: success

- [ ] **Step 3: Manual smoke**
  - In admin:
    - Switch brand in header
    - Open “Тексты страниц”
    - Confirm “Как заказать” keys appear on `home`
    - Edit values per brand; save; reload and confirm persistence
  - On site:
    - Confirm section renders per brand

