-- AlterTable
ALTER TABLE "Order" ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

-- Backfill: совпадает с прежней эвристикой findOrderBrandIdForNotify (любая позиция с товаром sprint-power)
UPDATE "Order" o
SET "brand" = 'sprint-power'
WHERE EXISTS (
  SELECT 1
  FROM "OrderItem" oi
  INNER JOIN "Product" p ON p.id = oi."productId"
  WHERE oi."orderId" = o.id
    AND TRIM(COALESCE(p."brand", '')) = 'sprint-power'
);

-- CreateIndex
CREATE INDEX "Order_brand_createdAt_idx" ON "Order"("brand", "createdAt");
