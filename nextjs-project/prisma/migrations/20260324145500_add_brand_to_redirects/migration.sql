ALTER TABLE "Redirect"
ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "Redirect"
DROP CONSTRAINT IF EXISTS "Redirect_sourcePath_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Redirect_brand_sourcePath_key"
ON "Redirect" ("brand", "sourcePath");

CREATE INDEX IF NOT EXISTS "Redirect_brand_sourcePath_idx"
ON "Redirect" ("brand", "sourcePath");
