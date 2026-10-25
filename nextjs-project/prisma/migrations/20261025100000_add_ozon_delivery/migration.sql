-- AlterTable
ALTER TABLE "ShippingInfo" ADD COLUMN     "ozonDeliveryPointId" TEXT;

-- CreateTable
CREATE TABLE "OzonDeliveryQuote" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "cartFingerprint" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "pointName" TEXT NOT NULL,
    "pointAddress" TEXT NOT NULL,
    "deliverySum" DOUBLE PRECISION NOT NULL,
    "estimatedDeliveryDays" INTEGER NOT NULL,
    "posting" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OzonDeliveryQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OzonShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "orderNumber" TEXT,
    "postingNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OzonShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OzonDeliveryPointCache" (
    "brand" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OzonDeliveryPointCache_pkey" PRIMARY KEY ("brand","pointId")
);

-- CreateIndex
CREATE INDEX "OzonDeliveryQuote_expiresAt_idx" ON "OzonDeliveryQuote"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OzonShipment_orderId_key" ON "OzonShipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OzonShipment_quoteId_key" ON "OzonShipment"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "OzonShipment_idempotencyKey_key" ON "OzonShipment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "OzonShipment_postingNumber_key" ON "OzonShipment"("postingNumber");

-- CreateIndex
CREATE INDEX "OzonShipment_status_updatedAt_idx" ON "OzonShipment"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "OzonDeliveryPointCache_brand_syncedAt_idx" ON "OzonDeliveryPointCache"("brand", "syncedAt");

-- AddForeignKey
ALTER TABLE "OzonShipment" ADD CONSTRAINT "OzonShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OzonShipment" ADD CONSTRAINT "OzonShipment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "OzonDeliveryQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
