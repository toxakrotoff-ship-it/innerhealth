ALTER TABLE "Order"
ADD COLUMN "yookassaCheckedAt" TIMESTAMP(3);

CREATE INDEX "Order_status_yookassaPaymentId_yookassaCheckedAt_idx"
ON "Order" ("status", "yookassaPaymentId", "yookassaCheckedAt");
