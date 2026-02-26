-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickOrder" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "comment" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Faq_isPublished_sortOrder_idx" ON "Faq"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "QuickOrder_status_createdAt_idx" ON "QuickOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuickOrder_productId_createdAt_idx" ON "QuickOrder"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "QuickOrder" ADD CONSTRAINT "QuickOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
