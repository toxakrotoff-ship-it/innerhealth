-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_deletedAt_createdAt_idx" ON "Order"("deletedAt", "createdAt");
