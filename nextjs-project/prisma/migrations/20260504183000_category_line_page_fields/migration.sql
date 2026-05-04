-- AlterTable
ALTER TABLE "Category"
ADD COLUMN "catalogTeaser" TEXT,
ADD COLUMN "linePageBodyRichJson" JSONB,
ADD COLUMN "featuredProductId" TEXT;

-- CreateIndex
CREATE INDEX "Category_featuredProductId_idx" ON "Category"("featuredProductId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_featuredProductId_fkey" FOREIGN KEY ("featuredProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
