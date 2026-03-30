ALTER TABLE "SeoHub"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

DROP INDEX IF EXISTS "SeoHub_slug_key";
CREATE UNIQUE INDEX "SeoHub_brand_slug_key" ON "SeoHub"("brand", "slug");
CREATE INDEX "SeoHub_brand_published_slug_idx" ON "SeoHub"("brand", "published", "slug");

ALTER TABLE "Faq"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

CREATE INDEX "Faq_brand_isPublished_sortOrder_idx" ON "Faq"("brand", "isPublished", "sortOrder");
