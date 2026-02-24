-- AlterTable
ALTER TABLE "Product" ADD COLUMN "discountPrice" DOUBLE PRECISION,
ADD COLUMN "isPromoEligible" BOOLEAN NOT NULL DEFAULT true;
