-- CreateEnum
CREATE TYPE "ActivityLogEntityType" AS ENUM (
  'PRODUCT',
  'CATEGORY'
);

-- CreateEnum
CREATE TYPE "ActivityLogAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE'
);

-- CreateTable
CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "entityType" "ActivityLogEntityType" NOT NULL,
  "action" "ActivityLogAction" NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityName" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "changes" JSONB,

  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_brand_createdAt_idx" ON "ActivityLog"("entityType", "brand", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");
