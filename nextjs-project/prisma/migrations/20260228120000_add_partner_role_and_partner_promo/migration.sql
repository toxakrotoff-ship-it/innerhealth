-- Add PARTNER to Role enum and create PartnerPromoCode table (partner–promo link with commission percent).

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PARTNER';

-- CreateTable
CREATE TABLE "PartnerPromoCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "commissionPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPromoCode_promoCodeId_key" ON "PartnerPromoCode"("promoCodeId");

-- CreateIndex
CREATE INDEX "PartnerPromoCode_userId_idx" ON "PartnerPromoCode"("userId");

-- AddForeignKey
ALTER TABLE "PartnerPromoCode" ADD CONSTRAINT "PartnerPromoCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPromoCode" ADD CONSTRAINT "PartnerPromoCode_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
