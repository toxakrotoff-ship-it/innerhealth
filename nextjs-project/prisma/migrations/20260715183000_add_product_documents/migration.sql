-- CreateEnum
CREATE TYPE "ProductDocumentType" AS ENUM (
  'CERTIFICATE',
  'DECLARATION',
  'TEST_REPORT',
  'INSTRUCTION',
  'LABEL',
  'OTHER'
);

-- CreateTable
CREATE TABLE "ProductDocument" (
  "id" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT 'inner',
  "title" TEXT NOT NULL,
  "type" "ProductDocumentType" NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "originalName" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "documentNumber" TEXT,
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocumentProduct" (
  "documentId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductDocumentProduct_pkey" PRIMARY KEY ("documentId","productId")
);

-- CreateIndex
CREATE INDEX "ProductDocument_brand_isPublished_type_sortOrder_idx" ON "ProductDocument"("brand", "isPublished", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductDocument_brand_title_idx" ON "ProductDocument"("brand", "title");

-- CreateIndex
CREATE INDEX "ProductDocument_brand_documentNumber_idx" ON "ProductDocument"("brand", "documentNumber");

-- CreateIndex
CREATE INDEX "ProductDocumentProduct_productId_sortOrder_idx" ON "ProductDocumentProduct"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductDocumentProduct_documentId_sortOrder_idx" ON "ProductDocumentProduct"("documentId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductDocumentProduct"
ADD CONSTRAINT "ProductDocumentProduct_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "ProductDocument"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocumentProduct"
ADD CONSTRAINT "ProductDocumentProduct_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
