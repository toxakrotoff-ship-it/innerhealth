-- Brand-scoped ContentBlock: migrate from page/key prefixes to (brand,page,key).
-- This migration is designed to be safe to re-run (guards via IF EXISTS/IF NOT EXISTS).

-- 1) Schema: add brand column
ALTER TABLE "ContentBlock"
  ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

-- 2) Drop old uniqueness on (page,key) before rewriting page/key values
ALTER TABLE "ContentBlock" DROP CONSTRAINT IF EXISTS "ContentBlock_page_key_key";
DROP INDEX IF EXISTS "ContentBlock_page_key_key";

-- 3) New uniqueness + supporting index
CREATE UNIQUE INDEX IF NOT EXISTS "ContentBlock_brand_page_key_key"
  ON "ContentBlock"("brand", "page", "key");

CREATE INDEX IF NOT EXISTS "ContentBlock_brand_page_idx"
  ON "ContentBlock"("brand", "page");

-- 4) Data: move sprint-power page prefix into brand
UPDATE "ContentBlock"
SET
  "brand" = 'sprint-power',
  "page" = regexp_replace("page", '^sprint-power::', '')
WHERE "page" LIKE 'sprint-power::%';

-- 5) Data: key remap for legacy prefixed sprint keys (collision-safe)
-- Phase A: remap to temporary keys that won't collide mid-update
UPDATE "ContentBlock"
SET "key" = CASE
  WHEN "key" = 'sprint.hero.badge' THEN '__tmp__/hero.badge'
  WHEN "key" = 'sprint.hero.title' THEN '__tmp__/hero.title'
  WHEN "key" = 'sprint.hero.subtitle' THEN '__tmp__/hero.subtitle'
  WHEN "key" = 'sprint.hero.cta.primary' THEN '__tmp__/hero.cta.primary'
  WHEN "key" = 'sprint.hero.cta.secondary' THEN '__tmp__/hero.cta.secondary'
  WHEN "key" = 'sprint.hero.featured' THEN '__tmp__/hero.featured'
  WHEN "key" = 'sprint.hits.title' THEN '__tmp__/hits.title'
  WHEN "key" = 'sprint.reviews.title' THEN '__tmp__/reviews.title'
  WHEN "key" = 'sprint.markers.title' THEN '__tmp__/markers.title'
  WHEN "key" = 'sprint.markers.item1' THEN '__tmp__/markers.item1'
  WHEN "key" = 'sprint.markers.item2' THEN '__tmp__/markers.item2'
  WHEN "key" = 'sprint.markers.item3' THEN '__tmp__/markers.item3'
  WHEN "key" = 'sprint.lineup.title' THEN '__tmp__/lineup.title'
  WHEN "key" = 'sprint.inner.title' THEN '__tmp__/crossBrand.title'
  WHEN "key" = 'sprint.inner.text' THEN '__tmp__/crossBrand.text'
  WHEN "key" = 'sprint.inner.cta' THEN '__tmp__/crossBrand.cta'
  WHEN "key" = 'sprint.faq.title' THEN '__tmp__/faq.title'
  WHEN "key" = 'sprint.faq.item1' THEN '__tmp__/faq.item1'
  WHEN "key" = 'sprint.faq.item2' THEN '__tmp__/faq.item2'
  WHEN "key" = 'sprint.faq.item3' THEN '__tmp__/faq.item3'
  WHEN "key" = 'sprint.faq.cta' THEN '__tmp__/faq.cta'
  WHEN "key" = 'faq.sprint.subtitle' THEN '__tmp__/faq.subtitle'
  WHEN "key" = 'faq.sprint.q1' THEN '__tmp__/faq.q1'
  WHEN "key" = 'faq.sprint.a1' THEN '__tmp__/faq.a1'
  WHEN "key" = 'faq.sprint.q2' THEN '__tmp__/faq.q2'
  WHEN "key" = 'faq.sprint.a2' THEN '__tmp__/faq.a2'
  WHEN "key" = 'faq.sprint.q3' THEN '__tmp__/faq.q3'
  WHEN "key" = 'faq.sprint.a3' THEN '__tmp__/faq.a3'
  WHEN "key" = 'faq.sprint.q4' THEN '__tmp__/faq.q4'
  WHEN "key" = 'faq.sprint.a4' THEN '__tmp__/faq.a4'
  ELSE "key"
END
WHERE "brand" = 'sprint-power'
  AND ("key" LIKE 'sprint.%' OR "key" LIKE 'faq.sprint.%');

-- Phase B: dedupe collisions deterministically (keep newest updatedAt)
WITH ranked AS (
  SELECT
    "id",
    "brand",
    "page",
    regexp_replace("key", '^__tmp__/', '') AS "canonicalKey",
    "updatedAt",
    row_number() OVER (
      PARTITION BY "brand", "page", regexp_replace("key", '^__tmp__/', '')
      ORDER BY "updatedAt" DESC, "id" DESC
    ) AS rn
  FROM "ContentBlock"
  WHERE "brand" = 'sprint-power'
    AND ("key" LIKE '__tmp__/%' OR "key" LIKE 'hero.%' OR "key" LIKE 'hits.%' OR "key" LIKE 'markers.%' OR "key" LIKE 'faq.%' OR "key" LIKE 'crossBrand.%' OR "key" LIKE 'lineup.%' OR "key" LIKE 'reviews.%')
)
DELETE FROM "ContentBlock" cb
USING ranked r
WHERE cb."id" = r."id"
  AND r.rn > 1;

-- Phase C: finalize temp keys to canonical
UPDATE "ContentBlock"
SET "key" = regexp_replace("key", '^__tmp__/', '')
WHERE "brand" = 'sprint-power'
  AND "key" LIKE '__tmp__/%';

-- 6) Inventory gate: fail if legacy prefixes remain for sprint brand
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ContentBlock"
    WHERE "brand" = 'sprint-power'
      AND ("key" LIKE 'sprint.%' OR "key" LIKE 'faq.sprint.%')
  ) THEN
    RAISE EXCEPTION 'Unmapped legacy sprint keys remain in ContentBlock for brand sprint-power';
  END IF;
END
$$;

