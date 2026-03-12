# Schema.org Microdata Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Organization-level schema.org JSON-LD across public `(site)` pages and add admin settings to control it.

**Architecture:** Use existing `SiteSetting` storage and `settings.service.ts` to store schema.org settings. Add a server-only helper `lib/schema-org.ts` to construct JSON-LD objects and render them via `<script type="application/ld+json">` in `(site)/layout.tsx`. Extend the admin `Настройки сайта` page to manage new keys.

**Tech Stack:** Next.js App Router, React Server Components, Prisma, Zod, TypeScript.

---

### Task 1: Extend SiteSetting keys for schema.org

**Files:**
- Modify: `src/services/settings.service.ts:9-23`

**Step 1:** Add new schema.org-related keys to `SETTING_KEYS` array.

**Step 2:** Ensure `SettingKey` type remains correct and no other code breaks due to additional keys.

**Step 3:** Run `npm test` or `npm run lint` (if available) focusing on TypeScript build / type checks.

### Task 2: Implement Organization JSON-LD builder

**Files:**
- Create: `src/lib/schema-org.ts`

**Step 1:** Implement `buildOrganizationJsonLd(settings: Record<string, string>): object | null` that:
- Reads `schema_org_enabled` and returns `null` if disabled.
- Builds a minimal-but-valid Organization JSON-LD using available fields.
- Parses `schema_org_social_links` into `sameAs` array.

**Step 2:** Mark the module as `server-only` and keep it free of client-only APIs.

**Step 3:** Add unit-level type checks (TypeScript) to ensure the function is pure and returns `object | null`.

### Task 3: Integrate Organization JSON-LD into (site) layout

**Files:**
- Modify: `src/app/(site)/layout.tsx:1-35`
- Use: `src/services/settings.service.ts:getSettingsMap`

**Step 1:** Make `(site)/layout.tsx` an async server component that:
- Imports `getSettingsMap` and `buildOrganizationJsonLd`.
- Loads settings server-side and builds JSON-LD.

**Step 2:** Render JSON-LD in the layout:
- If `organizationJsonLd` is not null, add:
  - `<script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />`
  - Place it near the end of `<div>` but before dynamic client components.

**Step 3:** Verify that the layout remains compatible with existing children and does not break dynamic imports.

### Task 4: Extend admin settings UI for schema.org

**Files:**
- Modify: `src/app/admin/settings/page.tsx:37-63, 189-261`

**Step 1:** Add new schema.org fields to `FIELDS` array with `group: 'site'`:
- `schema_org_enabled` (handled as text, but will be toggled via checkbox logic).
- `schema_org_organization_type`
- `schema_org_legal_name`
- `schema_org_url`
- `schema_org_logo_url`
- `schema_org_phone`
- `schema_org_address`
- `schema_org_social_links`

**Step 2:** For better UX, add a dedicated "Schema.org / микроразметка" card below existing site settings:
- Optionally, handle `schema_org_enabled` as a checkbox that writes `'1'` or `''` into `values`.

**Step 3:** Ensure `handleSubmit` still sends a flat record of strings and that Zod schema in `/api/admin/settings` accepts it.

### Task 5: Smoke test and validation

**Files:**
- No code changes; run and inspect.

**Step 1:** Start dev server: `npm run dev`.

**Step 2:** In admin `/admin/settings`, fill minimal schema.org fields and enable the flag. Save and reload.

**Step 3:** Open a public page (e.g. `/`) and inspect HTML to confirm the JSON-LD `<script>` is present and well-formed.

**Step 4:** Copy JSON-LD to an external validator (Google Rich Results Test / schema.org) and ensure there are no critical errors.

