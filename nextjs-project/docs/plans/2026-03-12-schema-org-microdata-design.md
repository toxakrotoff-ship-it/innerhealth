## Schema.org Microdata Design (Organization, Product, Article)

**Goal:** Implement schema.org JSON-LD microdata for the Inner Health site with a focus on Organization, and prepare the architecture to extend to Product and Article/NewsArticle later.

**Scope:**
- Store schema.org-related settings in existing `SiteSetting` key-value storage.
- Render Organization JSON-LD on all public `(site)` pages based on settings.
- Prepare clear extension points for Product and Article JSON-LD.
- Add admin UI in "Настройки сайта" to manage schema.org settings (current + future-friendly).

**Key Decisions:**
- Use JSON-LD via `<script type="application/ld+json">` as the primary mechanism for microdata.
- Keep all schema.org generation logic in a dedicated server-only helper under `lib/schema-org.ts`.
- Use existing `SiteSetting` model and `settings.service.ts` for storage, avoiding additional Prisma migrations.
- Respect security and validation rules:
  - All settings are simple strings validated via Zod at the API boundary.
  - No sensitive values (encryption is not required for schema.org fields).

### Data Sources

- Organization base data:
  - `SiteSetting`:
    - `site_name`
    - `site_contact_email`
    - `default_currency`
    - New keys for schema.org:
      - `schema_org_enabled`
      - `schema_org_organization_type`
      - `schema_org_legal_name`
      - `schema_org_url`
      - `schema_org_logo_url`
      - `schema_org_phone`
      - `schema_org_address`
      - `schema_org_social_links`
  - `ContentBlock` (optional future use for rich descriptions; not required for v1).

### JSON-LD Structures

#### Organization JSON-LD

- Rendered on all public `(site)` pages when `schema_org_enabled === '1'` (or `'true'`).
- Base structure:
  - `@context`: `https://schema.org`
  - `@type`: from `schema_org_organization_type` or fallback to `"Organization"`.
  - `name`: from `schema_org_legal_name` or `site_name`.
  - `url`: `schema_org_url` (if valid).
  - `logo`: `schema_org_logo_url` (if set).
  - `telephone`: `schema_org_phone` (if set).
  - `address`: `PostalAddress` built from `schema_org_address` as a single `streetAddress` line (minimal but valid).
  - `sameAs`: array built from `schema_org_social_links` split by comma/whitespace, filtered to valid URLs.

#### Product JSON-LD (future extension)

- Target: product detail page (card).
- Structure:
  - `@context`: `https://schema.org`
  - `@type`: `Product`
  - `name`, `description`, `image`, `sku`, `brand` (Inner Health).
  - `offers`:
    - `@type`: `Offer`
    - `price`, `priceCurrency` (from `default_currency`).
    - `availability` based on stock information (if `quantity` or another field is available).
    - `url`: absolute URL of the product page.

#### Article / NewsArticle JSON-LD (future extension)

- Target: post pages (`Post` model with `type` `"news"` or `"article"`).
- Structure:
  - `@context`: `https://schema.org`
  - `@type`: `NewsArticle` for `type === 'news'`, otherwise `Article`.
  - `headline`: post title.
  - `image`: preview image URL, if present.
  - `datePublished`: `createdAt`.
  - `dateModified`: same as `createdAt` for now (or extended later when `updatedAt` is available).
  - `author`: Inner Health (or dedicated field later).
  - `publisher`: Organization object or reference (`@id`) consistent with main Organization JSON-LD.

### Rendering Strategy

- Add a server-only helper in `lib/schema-org.ts`:
  - `buildOrganizationJsonLd(settings: Record<string, string>): object | null`
    - Reads relevant keys from `SiteSetting` (via `settings.service.ts`).
    - Returns a plain JS object or `null` if disabled or insufficient data.
- Use this helper in `(site)/layout.tsx`:
  - Fetch settings server-side (using `getSettingsMap`).
  - Call `buildOrganizationJsonLd`.
  - If result is not `null`, render:
    - `<script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />`
  - Add this script inside `<body>` but outside specific page content (after header or before footer).

### Admin UI Changes

- Extend `AdminSettingsPage` (`app/admin/settings/page.tsx`):
  - Keep existing groups `cdek`, `yookassa`, `site`.
  - Under `site` group, add a dedicated "Schema.org / микроразметка" card:
    - Checkbox `schema_org_enabled`:
      - Interpreted as `'1'` when checked, `''` when unchecked (to stay consistent with string-only settings).
    - Select `schema_org_organization_type`:
      - Options: `"Organization"`, `"LocalBusiness"`, `"MedicalBusiness"`, `"Store"`, `"HealthAndBeautyBusiness"` etc.
    - Text inputs:
      - `schema_org_legal_name`
      - `schema_org_url`
      - `schema_org_logo_url`
      - `schema_org_phone`
      - `schema_org_address`
      - `schema_org_social_links`
        - Helper text: "Ссылки через запятую, для sameAs".
- Backend:
  - `settings.service.ts`:
    - Extend `SETTING_KEYS` with new schema.org keys so they are persisted and returned.
  - `/api/admin/settings/route.ts`:
    - Zod schema is already `record(string, string)`; no structural change needed.

### Testing Strategy

- Manual checks:
  - Turn on `schema_org_enabled` in admin and fill minimal fields.
  - Open any public page and verify presence of JSON-LD script in HTML.
  - Copy JSON-LD into Google Rich Results Test / Schema.org validator and confirm no critical errors.
- Safety:
  - If settings are partially filled, helper should:
    - Still output best-effort JSON-LD (e.g., only `name` and `url`) without throwing.
    - Never crash page rendering.

