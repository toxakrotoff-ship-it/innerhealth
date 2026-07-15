CREATE TYPE "ProductRelationType" AS ENUM (
  'RELATED',
  'RECOMMENDED',
  'CROSS_SELL',
  'UPSELL',
  'ALTERNATIVE',
  'BUNDLE'
);

CREATE TABLE "ProductRelation" (
  "id" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT 'inner',
  "sourceProductId" TEXT NOT NULL,
  "targetProductId" TEXT NOT NULL,
  "relationType" "ProductRelationType" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductRelation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductRelation_source_target_not_same" CHECK ("sourceProductId" <> "targetProductId")
);

CREATE UNIQUE INDEX "ProductRelation_sourceProductId_targetProductId_relationType_key"
  ON "ProductRelation"("sourceProductId", "targetProductId", "relationType");

CREATE INDEX "ProductRelation_sourceProductId_relationType_isPublished_sortOrder_idx"
  ON "ProductRelation"("sourceProductId", "relationType", "isPublished", "sortOrder");

CREATE INDEX "ProductRelation_targetProductId_idx"
  ON "ProductRelation"("targetProductId");

CREATE INDEX "ProductRelation_brand_idx"
  ON "ProductRelation"("brand");

ALTER TABLE "ProductRelation"
  ADD CONSTRAINT "ProductRelation_sourceProductId_fkey"
  FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductRelation"
  ADD CONSTRAINT "ProductRelation_targetProductId_fkey"
  FOREIGN KEY ("targetProductId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
