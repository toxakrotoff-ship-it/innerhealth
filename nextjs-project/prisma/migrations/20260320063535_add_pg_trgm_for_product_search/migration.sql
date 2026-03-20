CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Speeds up `contains` / ILIKE '%q%' searches used in catalog suggestions.
-- Partial condition keeps the index small for production.
CREATE INDEX IF NOT EXISTS "Product_title_trgm_idx"
  ON public."Product"
  USING gin ("title" gin_trgm_ops)
  WHERE "isDraft" = false;

CREATE INDEX IF NOT EXISTS "Product_sku_trgm_idx"
  ON public."Product"
  USING gin ("sku" gin_trgm_ops)
  WHERE "isDraft" = false AND "sku" IS NOT NULL;