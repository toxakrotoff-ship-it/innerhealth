-- CreateTable
CREATE TABLE "TildaLead" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "tildaDate" TIMESTAMP(3) NOT NULL,
    "tildaTranId" TEXT NOT NULL,
    "input" TEXT,
    "input2" TEXT,
    "comment" TEXT,
    "deliveryAddress" TEXT,
    "review" TEXT,
    "delivery" TEXT,
    "promoCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TildaLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TildaLead_tildaTranId_key" ON "TildaLead"("tildaTranId");

-- CreateIndex
CREATE INDEX "TildaLead_tildaDate_idx" ON "TildaLead"("tildaDate");

-- CreateIndex
CREATE INDEX "TildaLead_email_idx" ON "TildaLead"("email");
