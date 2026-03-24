ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

CREATE INDEX IF NOT EXISTS "Review_brand_status_createdAt_idx"
ON "Review" ("brand", "status", "createdAt");
