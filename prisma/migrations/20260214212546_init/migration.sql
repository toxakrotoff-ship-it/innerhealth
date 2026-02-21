-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tildaUid" TEXT NOT NULL,
    "brand" TEXT,
    "sku" TEXT,
    "mark" TEXT,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "text" TEXT,
    "photo" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER,
    "priceOld" DOUBLE PRECISION,
    "editions" TEXT,
    "modifications" TEXT,
    "externalId" TEXT,
    "parentUid" TEXT,
    "characteristicsNutrition100g" TEXT,
    "characteristicsKkal" TEXT,
    "characteristicsContraindications" TEXT,
    "characteristicsShelfLife" TEXT,
    "characteristicsShelfLife2" TEXT,
    "characteristicsNutrition100gProduct" TEXT,
    "characteristicsEnergyValue100g" TEXT,
    "characteristicsNutrition100g2" TEXT,
    "characteristicsNutritionPerPortion5g" TEXT,
    "characteristicsComposition" TEXT,
    "characteristicsKkal100gDailyDose" TEXT,
    "characteristicsFormulation" TEXT,
    "characteristicsCalorie" TEXT,
    "characteristicsFlacon200ml" TEXT,
    "characteristicsStorage" TEXT,
    "weight" INTEGER,
    "length" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "seoTitle" TEXT,
    "seoDescr" TEXT,
    "seoKeywords" TEXT,
    "fbTitle" TEXT,
    "fbDescr" TEXT,
    "tab1" TEXT,
    "tab2" TEXT,
    "tab3" TEXT,
    "tab4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingInfo" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_tildaUid_key" ON "Product"("tildaUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingInfo_orderId_key" ON "ShippingInfo"("orderId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingInfo" ADD CONSTRAINT "ShippingInfo_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
