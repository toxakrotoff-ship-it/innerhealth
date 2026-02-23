-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: add status with default PENDING
ALTER TABLE "Review" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';

-- Existing reviews must stay visible on site (treat as already moderated)
UPDATE "Review" SET "status" = 'APPROVED';

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");
