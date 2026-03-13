-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "sortOrder" INTEGER;

-- AlterTable
ALTER TABLE "PromoCode" ALTER COLUMN "id" DROP DEFAULT;
