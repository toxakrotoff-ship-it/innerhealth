-- CreateTable
CREATE TABLE "B2bLead" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'inner',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "B2bLead_brand_createdAt_idx" ON "B2bLead"("brand", "createdAt");
