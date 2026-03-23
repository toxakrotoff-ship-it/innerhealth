-- Add manual flag for home "new arrivals" block
ALTER TABLE "Product"
ADD COLUMN "isFeaturedInNewArrivals" BOOLEAN NOT NULL DEFAULT false;

-- Support common home query (published + featured + fresh)
CREATE INDEX "Product_isDraft_isFeaturedInNewArrivals_createdAt_idx"
ON "Product"("isDraft", "isFeaturedInNewArrivals", "createdAt");
