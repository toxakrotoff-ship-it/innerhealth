# Site Popup Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a configurable popup on the home page with rich-text content, optional image (drag & drop upload), CTA button, and behavior settings (delay, frequency, auto-close), fully manageable from the admin panel.

**Architecture:** Add a dedicated Prisma model `SitePopup`, expose CRUD/admin actions and UI to edit a single global popup, and render it on the home page via a small client component that controls timers and localStorage-based frequency limits. Reuse existing rich-text editor and image upload patterns where possible, and keep popup logic fully on the frontend (no server-side state for show/hide per user).

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod, existing TipTap-based editor + upload components, Tailwind, shadcn UI.

---

### Task 1: Extend Prisma schema with SitePopup model

**Files:**
- Modify: `prisma/schema.prisma`
- Then run: `npx prisma format`
- Then run: `npx prisma migrate dev --name add_site_popup`

**Step 1: Add SitePopup model to schema.prisma**

- Add a new model near `ContentBlock`/`GiftPromotion`:
  - Fields:
    - `id String @id @default(cuid())`
    - `title String`
    - `isEnabled Boolean @default(false)`
    - `richJson Json?`
    - `imageUrl String?`
    - `ctaLabel String?`
    - `ctaUrl String?`
    - `delaySeconds Int @default(5)`
    - `hideForDays Int @default(7)`
    - `autoCloseSeconds Int?`
    - `createdAt DateTime @default(now())`
    - `updatedAt DateTime @updatedAt`

**Step 2: Run Prisma format**

- Run: `cd nextjs-project && npx prisma format`
- Expected: no errors, schema file reformatted.

**Step 3: Run migration**

- Run: `cd nextjs-project && npx prisma migrate dev --name add_site_popup`
- Expected:
  - Migration created under `prisma/migrations/*_add_site_popup/`.
  - Database updated successfully.

---

### Task 2: Add SitePopup service functions

**Files:**
- Create: `src/services/site-popup.service.ts`

**Step 1: Implement data access helpers**

- Add:
  - `async function getActiveSitePopup(): Promise<SitePopup | null>`:
    - Uses Prisma to fetch the latest record where `isEnabled = true`, ordered by `updatedAt desc`.
  - `async function getOrCreateSingletonSitePopup(): Promise<SitePopup>`:
    - Fetches the first record; if none exists, creates with defaults (`isEnabled=false`, delay/hide defaults).

**Step 2: Export named functions**

- Export only the two functions (no default export), typed with generated Prisma types.

---

### Task 3: Admin API/actions for editing SitePopup

**Files:**
- Create (or adapt to current pattern): `src/app/admin/site-popup/actions.ts`

**Step 1: Define Zod schema for payload**

- Define `sitePopupFormSchema` with fields:
  - `title` (non-empty string)
  - `isEnabled` (boolean)
  - `ctaLabel` (string, optional/nullable)
  - `ctaUrl` (string, optional/nullable)
  - `delaySeconds` (int ≥ 0)
  - `hideForDays` (int ≥ 0)
  - `autoCloseSeconds` (int ≥ 0 or null)
  - `richJson` (z.any().nullable()) — same format as TipTap content
  - `imageUrl` (string, optional) — populated by upload flow

**Step 2: Implement server actions**

- `export async function loadSitePopup(): Promise<SitePopup>`:
  - Calls `getOrCreateSingletonSitePopup` and returns it (or DTO).
- `export async function updateSitePopup(input: SitePopupFormInput): Promise<{ success: boolean; error?: string }>`:
  - Validates input with Zod.
  - Updates the existing singleton record by `id`.

---

### Task 4: Admin page UI for SitePopup

**Files:**
- Create: `src/app/admin/site-popup/page.tsx`
- Potentially reuse editor/upload components from existing admin paths (inspect and import).

**Step 1: Build server component wrapper**

- Fetch current popup with `loadSitePopup` (via server action or direct service call).
- Render a client form component with initial data.

**Step 2: Create client form component**

- Inside same file or as separate component file under `src/components/admin/site-popup-form.tsx`:
  - Use `useTransition`/`useState` to manage form state and submission.
  - Fields:
    - Switch for `isEnabled`.
    - Text input for `title`.
    - Drag & drop upload area for `imageUrl` (reuse existing upload component).
    - Rich‑text editor bound to `richJson`.
    - Inputs for `ctaLabel`, `ctaUrl`.
    - Numeric inputs for `delaySeconds`, `hideForDays`, `autoCloseSeconds`.
  - On submit:
    - Calls `updateSitePopup`.
    - Shows success/error toast.

**Step 3: Add live preview block**

- Under the form, render a `SitePopupPreview` component that:
  - Reuses the same popup UI component as on the front page.
  - Uses current form state (not necessarily saved) for immediate visual feedback.

---

### Task 5: Image upload integration (drag & drop)

**Files:**
- Reuse existing upload endpoint/component (inspect current project for where images are uploaded in admin).
- If needed, create helper under `src/components/admin/image-upload-field.tsx`.

**Step 1: Locate existing image upload logic**

- Use search to find current admin upload (e.g. for posts, products).
- Identify the component and API route used.

**Step 2: Wrap upload into reusable field for SitePopup**

- Implement a small client component:
  - Accepts `value` (string | null) and `onChange`.
  - Renders drag & drop area; on drop, uploads file and sets `imageUrl` on success.
  - Shows thumbnail and "Remove" button.

---

### Task 6: Home page integration (SSR + client popup)

**Files:**
- Modify: `src/app/(site)/page.tsx` (or actual home page route).
- Create: `src/components/site/home-popup-client.tsx`
- Optionally: `src/components/site/home-popup-modal.tsx` (UI only).

**Step 1: Fetch active popup on server**

- In the home page server component:
  - Call `getActiveSitePopup()`.
  - Pass result (or a mapped DTO) to `HomePopupClient` as prop.

**Step 2: Implement HomePopupClient (client component)**

- Props: a serializable DTO with needed fields or `null`.
- Behavior:
  - If no popup or `!isEnabled`, render `null`.
  - On mount:
    - Read localStorage key `innerhealth_site_popup_<id>`.
    - If exists and within `hideForDays`, do nothing.
    - Else:
      - Start `setTimeout` for `delaySeconds` to open popup.
      - If `autoCloseSeconds > 0`, set another timeout to close.
  - On close:
    - Write current ISO date to localStorage under the same key.
    - Clear timers.

**Step 3: Implement popup UI component**

- Use shadcn `Dialog` or equivalent:
  - Backdrop + centered card.
  - Image (if `imageUrl`).
  - Rich‑text content (render TipTap JSON using existing renderer).
  - CTA button if `ctaLabel` and `ctaUrl` set.
  - Close button (X).

---

### Task 7: Lint, typecheck, and build

**Files/Commands:**
- Run from `nextjs-project` root.

**Step 1: Run ESLint (if configured)**

- Run: `npm run lint`
- Fix straightforward issues in modified files.

**Step 2: Run TypeScript check (if configured)**

- Run: `npm run typecheck` (or `next lint` if that's the pattern).

**Step 3: Run production build**

- Run: `npm run build`
- Ensure build passes with no type errors.

---

### Task 8: Final verification

**Manual checks (local):**

1. Open admin:
   - Navigate to Site Popup page.
   - Enable popup, set small `delaySeconds` (e.g., 1) and `hideForDays = 0`.
   - Add image, text, and CTA link (`/catalog/aktsii`).
   - Save and see no errors.
2. Open home page:
   - Confirm popup appears after delay.
   - Confirm clicking close prevents it from immediately re-opening according to `hideForDays`.
   - Confirm CTA button navigates to the configured URL.
3. Disable popup:
   - Verify it no longer appears on home page.

