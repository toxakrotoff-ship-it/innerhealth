-- Add unique constraint on Product.slug to match schema (@unique).
-- Fails if duplicate slugs exist; fix data first (e.g. backfill:slug or manual dedupe) then re-run migrate deploy.
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
