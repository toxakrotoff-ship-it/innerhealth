ALTER TABLE "Category"
ADD COLUMN     "pageTitle" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoKeywords" TEXT,
ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Category_brand_isPublished_sortOrder_idx" ON "Category"("brand", "isPublished", "sortOrder");
