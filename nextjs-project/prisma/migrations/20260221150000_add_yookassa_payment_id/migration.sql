-- AlterTable
ALTER TABLE "Order" ADD COLUMN "yookassaPaymentId" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "Order_yookassaPaymentId_key" ON "Order"("yookassaPaymentId");
