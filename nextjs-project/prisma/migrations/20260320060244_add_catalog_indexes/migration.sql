-- CreateIndex
CREATE INDEX "Category_showInCategoriesBlock_sortOrder_idx" ON "Category"("showInCategoriesBlock", "sortOrder");

-- CreateIndex
CREATE INDEX "Post_published_type_createdAt_idx" ON "Post"("published", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Product_isDraft_createdAt_idx" ON "Product"("isDraft", "createdAt");

-- CreateIndex
CREATE INDEX "Product_isDraft_brand_idx" ON "Product"("isDraft", "brand");

-- CreateIndex
CREATE INDEX "Product_isDraft_price_createdAt_idx" ON "Product"("isDraft", "price", "createdAt");

-- CreateIndex
CREATE INDEX "Product_isDraft_priceOld_idx" ON "Product"("isDraft", "priceOld");

-- CreateIndex
CREATE INDEX "Product_isDraft_title_createdAt_idx" ON "Product"("isDraft", "title", "createdAt");

-- CreateIndex
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
