-- AlterTable Post: backfill-friendly updatedAt
ALTER TABLE "Post" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Post" SET "updatedAt" = "createdAt";

-- CreateTable
CREATE TABLE "CatalogSearchZeroHit" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '/catalog',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogSearchZeroHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoHub" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" JSONB NOT NULL,
    "productSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoHub_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogSearchZeroHit_createdAt_idx" ON "CatalogSearchZeroHit"("createdAt");

-- CreateIndex
CREATE INDEX "CatalogSearchZeroHit_query_idx" ON "CatalogSearchZeroHit"("query");

-- CreateIndex
CREATE UNIQUE INDEX "SeoHub_slug_key" ON "SeoHub"("slug");

-- CreateIndex
CREATE INDEX "SeoHub_published_slug_idx" ON "SeoHub"("published", "slug");
