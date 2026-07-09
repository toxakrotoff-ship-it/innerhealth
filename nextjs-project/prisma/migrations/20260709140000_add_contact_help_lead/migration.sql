-- CreateTable
CREATE TABLE "ContactHelpLead" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'inner',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactHelpLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactHelpLead_brand_createdAt_idx" ON "ContactHelpLead"("brand", "createdAt");
