# Lead Export Period Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the ability in the admin "Выгрузка лидов" tab to download CSV for a specific period, using both preset ranges (dropdown) and a custom date range.

**Architecture:** Reuse the existing leads export API route and service by extending them with optional date filters derived from validated query parameters. The admin UI will submit a simple GET form to the existing export endpoint, passing either a preset identifier or explicit `from`/`to` dates, with all validation performed server-side via Zod before calling the Prisma-backed service.

**Tech Stack:** Next.js App Router, React (client component for admin page), Zod for input validation, Prisma for DB access, Tailwind CSS for styling.

---

### Task 1: Extend leads export service with optional date filter

**Files:**
- Modify: `src/services/leads-export.service.ts`

**Steps:**
1. Introduce a `LeadExportFilter` interface with optional `from` and `to` fields of type `Date`.
2. Update the `getAllLeadsForExport` function signature to accept an optional `filter?: LeadExportFilter`.
3. Inside `getAllLeadsForExport`, derive `where` objects for `partnershipLead.createdAt`, `tildaLead.tildaDate`, and `quickOrder.createdAt` based on the presence of `filter.from` and/or `filter.to`.
4. Pass the appropriate `where` clauses into each Prisma `findMany` call while keeping the existing `orderBy` and `include` options unchanged.

### Task 2: Add query parsing and validation in export API route

**Files:**
- Modify: `src/app/api/admin/leads/export/route.ts`

**Steps:**
1. Update the `GET` handler signature to accept the `request: Request` argument.
2. Use `URL` and `request.url` to extract `searchParams` and turn them into a plain object.
3. Define a Zod schema that supports:
   - `preset` as an optional enum (e.g. `all`, `today`, `last7`, `last30`, `thisMonth`, `prevMonth`).
   - `from` and `to` as optional strings in `YYYY-MM-DD` format.
4. Implement safe parsing with `schema.safeParse`, returning a `400` JSON response with a generic error message if validation fails.
5. Add a helper function that converts the validated `preset`/`from`/`to` into a concrete `LeadExportFilter` (`from` and `to` as `Date` objects with inclusive bounds).
6. Call `getAllLeadsForExport(filter)` with the computed filter and keep the CSV-building logic unchanged.

### Task 3: Update admin UI to send period filters

**Files:**
- Modify: `src/app/admin/leads-export/page.tsx`

**Steps:**
1. Replace the simple anchor link with a `<form method="GET" action="/api/admin/leads/export">` wrapping the controls and submit button.
2. Add a `<select>` element for presets with options such as "За всё время", "Сегодня", "За последние 7 дней", "За последние 30 дней", "Текущий месяц", "Прошлый месяц", binding each option to the corresponding `preset` value expected by the API.
3. Add two `<input type="date">` fields named `from` and `to` for manual period selection, with a short helper text explaining that both presets and manual dates can be used.
4. Style the controls using existing admin layout classes and Tailwind utilities so that the UI remains consistent with other admin pages.
5. Keep the submit button text and icon essentially the same, clarifying in the description that the export respects the selected period.

### Task 4: Manual verification

**Steps:**
1. Start the Next.js dev server if not already running.
2. In the admin panel, navigate to the "Выгрузка лидов" tab.
3. Test CSV download with the default preset ("За всё время") and confirm it matches previous behavior.
4. Test each preset option and inspect dates inside the CSV to ensure only rows within the expected range are included.
5. Test a custom period by setting `from` and `to` and leaving the preset as "За всё время" (or a neutral option), verifying that the export respects the custom range.
6. Try invalid combinations (e.g. `from` later than `to`) and ensure the API responds with a 400 JSON error instead of a CSV file.

