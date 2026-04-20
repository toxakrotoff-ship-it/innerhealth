# Mobile catalog cards + dev start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make catalog product cards fit on mobile via horizontal layout (option B) and fix `npm run dev` startup for this Next.js app.

**Architecture:** Use responsive Tailwind classes to switch card layout at `max-sm` to `flex-row`, constrain the image column to a bounded square, clamp title/metadata to avoid overflow, and keep desktop layout unchanged. Fix dev startup by removing unsupported `--webpack` flag and ensuring Next.js config format matches current Next (use `next.config.js`).

**Tech Stack:** Next.js App Router, React, Tailwind CSS, `next/image`.

---

## File structure

**Modify:**
- `nextjs-project/src/components/site/product-card.tsx`
- `nextjs-project/src/components/site/grouped-product-card.tsx`
- `nextjs-project/package.json`
- `nextjs-project/next.config.ts` (migrate away)

**Create:**
- `nextjs-project/next.config.js`

---

### Task 1: Update `ProductCard` mobile layout (horizontal)

**Files:**
- Modify: `nextjs-project/src/components/site/product-card.tsx`

- [ ] **Step 1: Change wrapper layout on `max-sm`**
  - Make the card body `flex-row` on `max-sm`, `flex-col` from `sm` up.
  - Make the image region a fixed square column on `max-sm`.

- [ ] **Step 2: Preserve image proportions**
  - Force `object-contain object-center` on `max-sm` regardless of existing transform fit mode.

- [ ] **Step 3: Protect title/metadata**
  - Ensure title stays `line-clamp-2` and cannot overflow horizontally.
  - Keep SKU as `line-clamp-1` and `max-w-full` to prevent layout break.

- [ ] **Step 4: Actions fit**
  - Keep both buttons visible, reduce vertical padding on `max-sm` where safe, and ensure `min-h-[40px]` tap target.

- [ ] **Step 5: Quick local check**
  - Run: `npm test --silent` (optional if fast) or at minimum ensure TypeScript builds via `npm run lint` if already configured.

---

### Task 2: Update `GroupedProductCard` mobile layout (horizontal + compact chips)

**Files:**
- Modify: `nextjs-project/src/components/site/grouped-product-card.tsx`

- [ ] **Step 1: Apply same `max-sm:flex-row` layout**
- [ ] **Step 2: Force `object-contain` on mobile image**
- [ ] **Step 3: Compact flavor chips**
  - Reduce chip font size/padding slightly on `max-sm`.
  - Ensure chips never cause horizontal overflow (wrap allowed).

---

### Task 3: Fix dev start (`npm run dev`)

**Files:**
- Modify: `nextjs-project/package.json`
- Create: `nextjs-project/next.config.js`
- (Keep for reference): `nextjs-project/next.config.ts` (stop using)

- [ ] **Step 1: Update scripts**
  - Change `dev` to `next dev --port 3000` (no `--webpack`).

- [ ] **Step 2: Migrate config**
  - Create `next.config.js` equivalent of `next.config.ts`.
  - Ensure Next loads JS config and `npm run dev` starts.

- [ ] **Step 3: Verify**
  - Run: `npm run dev` and confirm it prints the local URL without errors.

