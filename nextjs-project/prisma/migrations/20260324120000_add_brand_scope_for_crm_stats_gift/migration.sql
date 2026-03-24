-- Add brand scope columns for CRM, gift promotions and analytics.
ALTER TABLE "GiftPromotion"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "QuickOrder"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "TildaLead"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

DROP INDEX IF EXISTS "TildaLead_tildaTranId_key";
CREATE UNIQUE INDEX "TildaLead_brand_tildaTranId_key"
ON "TildaLead" ("brand", "tildaTranId");

ALTER TABLE "PartnershipLead"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "AnalyticsEvent"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "DailyTrafficStats"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "DailyDeviceStats"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "DailyFunnelStats"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

-- Replace uniques that now include brand.
DROP INDEX IF EXISTS "DailyTrafficStats_date_path_key";
CREATE UNIQUE INDEX "DailyTrafficStats_brand_date_path_key"
ON "DailyTrafficStats" ("brand", "date", "path");

DROP INDEX IF EXISTS "DailyDeviceStats_date_key";
CREATE UNIQUE INDEX "DailyDeviceStats_brand_date_key"
ON "DailyDeviceStats" ("brand", "date");

DROP INDEX IF EXISTS "DailyFunnelStats_date_step_key";
CREATE UNIQUE INDEX "DailyFunnelStats_brand_date_step_key"
ON "DailyFunnelStats" ("brand", "date", "step");

-- Query performance indexes for admin brand filtering.
CREATE INDEX IF NOT EXISTS "GiftPromotion_brand_createdAt_idx"
ON "GiftPromotion" ("brand", "createdAt");

CREATE INDEX IF NOT EXISTS "QuickOrder_brand_status_createdAt_idx"
ON "QuickOrder" ("brand", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "TildaLead_brand_createdAt_idx"
ON "TildaLead" ("brand", "createdAt");

CREATE INDEX IF NOT EXISTS "TildaLead_brand_tildaDate_idx"
ON "TildaLead" ("brand", "tildaDate");

CREATE INDEX IF NOT EXISTS "PartnershipLead_brand_createdAt_idx"
ON "PartnershipLead" ("brand", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_brand_occurredAt_idx"
ON "AnalyticsEvent" ("brand", "occurredAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_brand_type_occurredAt_idx"
ON "AnalyticsEvent" ("brand", "type", "occurredAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_brand_path_occurredAt_idx"
ON "AnalyticsEvent" ("brand", "path", "occurredAt");

CREATE INDEX IF NOT EXISTS "DailyTrafficStats_brand_date_idx"
ON "DailyTrafficStats" ("brand", "date");

CREATE INDEX IF NOT EXISTS "DailyDeviceStats_brand_date_idx"
ON "DailyDeviceStats" ("brand", "date");

CREATE INDEX IF NOT EXISTS "DailyFunnelStats_brand_date_idx"
ON "DailyFunnelStats" ("brand", "date");
