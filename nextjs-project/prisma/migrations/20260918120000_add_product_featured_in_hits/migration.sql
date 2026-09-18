-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isFeaturedInHits" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_isDraft_isFeaturedInHits_createdAt_idx" ON "Product"("isDraft", "isFeaturedInHits", "createdAt");
