-- CreateEnum
CREATE TYPE "CheckoutStep" AS ENUM ('CART', 'CONTACT', 'DELIVERY', 'CONFIRMATION', 'ORDER_CREATED', 'PAYMENT_INITIALIZATION', 'PAYMENT_CREATED', 'PAYMENT_REDIRECT', 'PAYMENT_PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('ACTIVE', 'ABANDONED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CheckoutEventType" AS ENUM ('CHECKOUT_STARTED', 'CONTACT_ENTERED', 'DELIVERY_SELECTED', 'PROMO_APPLIED', 'ORDER_CREATED', 'PAYMENT_INITIALIZATION_STARTED', 'PAYMENT_CREATED', 'PAYMENT_REDIRECTED', 'PAYMENT_CALLBACK_RECEIVED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'CHECKOUT_COMPLETED', 'CHECKOUT_ABANDONED', 'CHECKOUT_REACTIVATED', 'VALIDATION_ERROR', 'API_ERROR', 'PAYMENT_PROVIDER_ERROR');

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'inner',
    "userId" TEXT,
    "guestToken" TEXT,
    "anonId" TEXT,
    "fullName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "cartSnapshot" JSONB,
    "cartItemsCount" INTEGER NOT NULL DEFAULT 0,
    "cartTotal" DOUBLE PRECISION,
    "promoCode" TEXT,
    "deliveryMethod" TEXT,
    "deliverySum" DOUBLE PRECISION,
    "currentStep" "CheckoutStep" NOT NULL DEFAULT 'CART',
    "lastCompletedStep" "CheckoutStep",
    "status" "CheckoutStatus" NOT NULL DEFAULT 'ACTIVE',
    "orderId" TEXT,
    "paymentProvider" TEXT,
    "paymentId" TEXT,
    "paymentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutEvent" (
    "id" TEXT NOT NULL,
    "checkoutSessionId" TEXT NOT NULL,
    "eventType" "CheckoutEventType" NOT NULL,
    "step" "CheckoutStep",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_guestToken_key" ON "CheckoutSession"("guestToken");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_orderId_key" ON "CheckoutSession"("orderId");

-- CreateIndex
CREATE INDEX "CheckoutSession_status_idx" ON "CheckoutSession"("status");

-- CreateIndex
CREATE INDEX "CheckoutSession_createdAt_idx" ON "CheckoutSession"("createdAt");

-- CreateIndex
CREATE INDEX "CheckoutSession_lastActivityAt_idx" ON "CheckoutSession"("lastActivityAt");

-- CreateIndex
CREATE INDEX "CheckoutSession_brand_idx" ON "CheckoutSession"("brand");

-- CreateIndex
CREATE INDEX "CheckoutSession_brand_status_lastActivityAt_idx" ON "CheckoutSession"("brand", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "CheckoutSession_phone_idx" ON "CheckoutSession"("phone");

-- CreateIndex
CREATE INDEX "CheckoutSession_email_idx" ON "CheckoutSession"("email");

-- CreateIndex
CREATE INDEX "CheckoutSession_userId_idx" ON "CheckoutSession"("userId");

-- CreateIndex
CREATE INDEX "CheckoutEvent_checkoutSessionId_createdAt_idx" ON "CheckoutEvent"("checkoutSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CheckoutEvent_eventType_createdAt_idx" ON "CheckoutEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutEvent" ADD CONSTRAINT "CheckoutEvent_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
