-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "giftPromotionId" TEXT,
ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GiftPromotion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enabled',
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "giftProductId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerProductId" TEXT,
    "triggerProductMinQty" INTEGER,
    "minCartTotal" DOUBLE PRECISION,
    "cartTotalCalculationMode" TEXT,
    "giftQuantityMode" TEXT NOT NULL,
    "maxGiftsPerOrder" INTEGER,
    "promoProductInteractionMode" TEXT,
    "promoCodeInteractionMode" TEXT,
    "autoRemoveWhenConditionFails" BOOLEAN NOT NULL DEFAULT true,
    "userCanRemoveGiftManually" BOOLEAN NOT NULL DEFAULT false,
    "showOnSite" BOOLEAN NOT NULL DEFAULT false,
    "siteTitle" TEXT,
    "siteDescription" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftPromotion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_giftPromotionId_fkey" FOREIGN KEY ("giftPromotionId") REFERENCES "GiftPromotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftPromotion" ADD CONSTRAINT "GiftPromotion_giftProductId_fkey" FOREIGN KEY ("giftProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
