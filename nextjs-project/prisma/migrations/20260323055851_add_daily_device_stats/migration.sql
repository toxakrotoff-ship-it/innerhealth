-- DropIndex
DROP INDEX "Product_sku_trgm_idx";

-- DropIndex
DROP INDEX "Product_title_trgm_idx";

-- CreateTable
CREATE TABLE "DailyDeviceStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "desktop" INTEGER NOT NULL DEFAULT 0,
    "mobile" INTEGER NOT NULL DEFAULT 0,
    "tablet" INTEGER NOT NULL DEFAULT 0,
    "unknown" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyDeviceStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyDeviceStats_date_idx" ON "DailyDeviceStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDeviceStats_date_key" ON "DailyDeviceStats"("date");
