-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'CLICK', 'CART_ADD', 'CHECKOUT_START', 'ORDER_CREATED');

-- CreateEnum
CREATE TYPE "FunnelStep" AS ENUM ('PAGE_VIEW', 'CART_ADD', 'CHECKOUT_START', 'ORDER_CREATED');

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT,
    "anonId" TEXT,
    "type" "AnalyticsEventType" NOT NULL,
    "path" TEXT NOT NULL,
    "pageTitle" TEXT,
    "meta" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTrafficStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "path" TEXT,
    "pageViews" INTEGER NOT NULL,
    "sessions" INTEGER NOT NULL,
    "users" INTEGER,
    "clicks" INTEGER NOT NULL,

    CONSTRAINT "DailyTrafficStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFunnelStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "step" "FunnelStep" NOT NULL,
    "count" INTEGER NOT NULL,
    "conversionToNext" DOUBLE PRECISION,

    CONSTRAINT "DailyFunnelStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_occurredAt_idx" ON "AnalyticsEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_path_occurredAt_idx" ON "AnalyticsEvent"("path", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_occurredAt_idx" ON "AnalyticsEvent"("sessionId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTrafficStats_date_path_key" ON "DailyTrafficStats"("date", "path");

-- CreateIndex
CREATE UNIQUE INDEX "DailyFunnelStats_date_step_key" ON "DailyFunnelStats"("date", "step");
