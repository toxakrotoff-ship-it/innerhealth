ALTER TABLE "Category"
ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "Category"
DROP CONSTRAINT IF EXISTS "Category_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Category_brand_slug_key"
ON "Category" ("brand", "slug");

CREATE INDEX IF NOT EXISTS "Category_brand_parentId_idx"
ON "Category" ("brand", "parentId");

CREATE INDEX IF NOT EXISTS "Category_brand_showInCategoriesBlock_sortOrder_idx"
ON "Category" ("brand", "showInCategoriesBlock", "sortOrder");
