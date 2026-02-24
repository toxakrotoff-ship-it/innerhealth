-- AlterTable
ALTER TABLE "Order" ADD COLUMN "cdekOrderUuid" TEXT,
ADD COLUMN "cdekOrderError" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_cdekOrderUuid_key" ON "Order"("cdekOrderUuid");

-- AlterTable
ALTER TABLE "ShippingInfo" ADD COLUMN "deliveryMethod" TEXT,
ADD COLUMN "cdekCityCode" INTEGER,
ADD COLUMN "cdekPvzCode" TEXT,
ADD COLUMN "cdekTariffCode" INTEGER,
ADD COLUMN "street" TEXT,
ADD COLUMN "house" TEXT,
ADD COLUMN "apartment" TEXT,
ADD COLUMN "entrance" TEXT,
ADD COLUMN "floor" TEXT,
ADD COLUMN "intercom" TEXT;
