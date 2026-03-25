## Goal

Make admin “Тексты страниц” and runtime copy **brand-scoped** in a strict, consistent way:

- Same `page` + same `key` across brands.
- Values differ by brand.
- No brand-specific key prefixes like `sprint.*`.
- No heuristic filtering of defaults per brand.
- “Как заказать” (3 step cards) becomes editable via the same editor.

## Current state (problems)

- `ContentBlock` scopes brand by encoding it into `page` (e.g. `sprint-power::home`) via `getScopedPage()`.
- Defaults are partly brand-scoped by **key prefixes** (`sprint.*`, `faq.sprint.*`) and filtered via `shouldIncludeDefaultForBrand()` heuristics.
- This creates drift, makes it hard to validate/extend, and causes confusing admin behavior.

## Non-goals

- Changing the overall admin UX for editing content blocks.
- Introducing a new “segment”/builder for this copy.
- Refactoring unrelated content systems (news, SEO hubs, products).

## Design

### Data model

Store brand separately from page.

- Add `brand` field to `ContentBlock` (string, default `"inner"`).
- Update uniqueness constraint from `@@unique([page, key])` to `@@unique([brand, page, key])`.

**Invariant**

\[
(\text{brand}, \text{page}, \text{key}) \rightarrow \text{ContentBlock}
\]

### Migration strategy

1. **Schema migration**
   - Add `brand String @default("inner")` to `ContentBlock`.
   - Replace uniqueness constraint to include `brand`.
2. **Data migration**
   - For rows with `page` like `sprint-power::<page>`:
     - Set `brand = "sprint-power"`.
     - Rewrite `page` to the unscoped value (`home`, `faq`, etc).
   - For all other rows:
     - Keep `page` as-is.
     - Set/keep `brand = "inner"`.

Notes:
- If more brands are introduced later, this structure supports them without new string encodings.
- Data migration should be deterministic and idempotent at the SQL level.
- **Critical ordering**: the old unique constraint on `(page,key)` must be dropped **before** rewriting `page` values to avoid collisions.

#### Migration ordering (Postgres)

Within the same deploy window:

- Add column `brand` (default `inner`)
- **Drop** the old unique index/constraint for `(page,key)`
- **Create** new unique index/constraint for `(brand,page,key)`
- Run data updates:
  - `UPDATE ... WHERE page LIKE 'sprint-power::%'`:
    - set `brand='sprint-power'`
    - strip prefix via strict prefix removal (not a generic split)

Also add a supporting index for common reads:

- `INDEX (brand, page)` to speed up `findMany({ where: { brand, page } })`.

### Defaults

`CONTENT_BLOCK_DEFAULTS` becomes **brand-agnostic**:

- Remove brand-specific key prefixes (`sprint.*`, `faq.sprint.*`).
- Keep a single set of defaults per `page`.

Brand-specific differences will be stored as `ContentBlock` rows for that brand.

#### Key migration (from prefixed keys)

Existing persisted blocks may use prefixed keys (e.g. `sprint.hero.title`, `faq.sprint.q1`).
We will migrate these rows to canonical (brand-agnostic) keys under `brand='sprint-power'`.

Examples (non-exhaustive, will be implemented as an explicit mapping):

- `sprint.hero.badge` → `hero.badge`
- `sprint.hero.title` → `hero.title`
- `sprint.hero.subtitle` → `hero.subtitle`
- `sprint.hero.cta.primary` → `hero.cta.primary`
- `sprint.hero.cta.secondary` → `hero.cta.secondary`
- `sprint.hero.featured` → `hero.featured`
- `sprint.hits.title` → `hits.title`
- `sprint.reviews.title` → `reviews.title`
- `sprint.markers.title` → `markers.title`
- `sprint.markers.item1|2|3` → `markers.item1|2|3`
- `sprint.lineup.title` → `lineup.title`
- `sprint.inner.title|text|cta` → `crossBrand.title|text|cta`
- `sprint.faq.*` (home section) → `faq.*` (home section)
- `faq.sprint.*` (FAQ page) → `faq.*` (FAQ page)

Any keys without a defined mapping must be inventoried and either mapped or explicitly deprecated before deployment.

### Content resolution rules

For a given `(brand, page)`:

- Load defaults: all entries where `default.page === page`.
- Load persisted blocks: `ContentBlock.findMany({ where: { brand, page } })`.
- For each default key:
  - If persisted exists: use persisted value.
  - If not: return default value.

### Code changes (high level)

- Remove `getScopedPage()` and `shouldIncludeDefaultForBrand()` from `src/services/content-block.service.ts`.
- Update queries to include `brand` in `where` filters and unique upserts.
- Keep API contract unchanged (`/api/admin/content-blocks?page=...`); brand is resolved from request scope (cookie/query/header) as today.

### “Как заказать” (3 cards)

Make editable via content blocks on the relevant page (currently `home`).

Add new default keys (page: `home`):

- `howToOrder.title`
- `howToOrder.step1.title`
- `howToOrder.step1.text`
- `howToOrder.step1.href`
- `howToOrder.step1.linkLabel`
- `howToOrder.step2.*`
- `howToOrder.step3.*`

Update `src/components/site/how-to-order-steps.tsx` to read these values from resolved content blocks instead of hardcoded `steps`.

### Validation

- All admin inputs continue to be validated at API boundary with Zod (existing behavior).
- `href` fields should be constrained to internal paths:
  - `href === href.trim()`
  - starts with `/`
  - does not start with `//`
  - contains no whitespace/control chars
  - parse with `new URL(href, 'https://example.invalid')` and enforce `url.origin === 'https://example.invalid'`
  - optional hardening: allowlist internal routes used by this section

### Backward compatibility / rollout

Deployment sequence:

- **First** run DB migration (`prisma migrate deploy`) to add `brand`, update indexes, and migrate existing data.
- **Then** deploy application code that relies on `brand` and canonical keys.

Data changes:

- Existing Sprint-scoped rows (with `sprint-power::`) will be migrated into `brand="sprint-power"` + unscoped page.
- Prefixed keys will be mapped to canonical keys under `brand="sprint-power"`.

After migration and code update, “Тексты страниц” will show a consistent list of blocks per page across brands.

## Test plan

- Load admin “Тексты страниц” for `inner` brand, verify it lists expected blocks, saving persists to `brand=inner`.
- Switch to `sprint-power`, verify the same keys are present (same `page`), values can differ, and saving persists to `brand=sprint-power`.
- On public site:
  - Inner brand renders “Как заказать” using `howToOrder.*` values.
  - Sprint brand renders “Как заказать” using its own `howToOrder.*` values.
- Verify API brand scoping works via cookie and/or `?brand=` query (no regression).

