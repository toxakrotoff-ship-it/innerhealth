ALTER TABLE "TelegramWhitelist"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "TelegramLinkCode"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "MaxWhitelist"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "MaxLinkCode"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

DROP INDEX IF EXISTS "TelegramWhitelist_userId_key";
DROP INDEX IF EXISTS "TelegramWhitelist_telegramUserId_key";
DROP INDEX IF EXISTS "MaxWhitelist_userId_key";
DROP INDEX IF EXISTS "MaxWhitelist_maxUserId_key";
DROP INDEX IF EXISTS "TelegramLinkCode_code_key";
DROP INDEX IF EXISTS "MaxLinkCode_code_key";
DROP INDEX IF EXISTS "TelegramLinkCode_code_idx";
DROP INDEX IF EXISTS "MaxLinkCode_code_idx";

CREATE UNIQUE INDEX "TelegramWhitelist_brand_userId_key"
ON "TelegramWhitelist"("brand", "userId");

CREATE UNIQUE INDEX "TelegramWhitelist_brand_telegramUserId_key"
ON "TelegramWhitelist"("brand", "telegramUserId");

CREATE INDEX "TelegramWhitelist_brand_userId_idx"
ON "TelegramWhitelist"("brand", "userId");

CREATE INDEX "TelegramWhitelist_brand_telegramUserId_idx"
ON "TelegramWhitelist"("brand", "telegramUserId");

CREATE UNIQUE INDEX "TelegramLinkCode_brand_code_key"
ON "TelegramLinkCode"("brand", "code");

CREATE INDEX "TelegramLinkCode_code_idx"
ON "TelegramLinkCode"("code");

CREATE INDEX "TelegramLinkCode_brand_userId_idx"
ON "TelegramLinkCode"("brand", "userId");

CREATE UNIQUE INDEX "MaxWhitelist_brand_userId_key"
ON "MaxWhitelist"("brand", "userId");

CREATE UNIQUE INDEX "MaxWhitelist_brand_maxUserId_key"
ON "MaxWhitelist"("brand", "maxUserId");

CREATE INDEX "MaxWhitelist_brand_userId_idx"
ON "MaxWhitelist"("brand", "userId");

CREATE INDEX "MaxWhitelist_brand_maxUserId_idx"
ON "MaxWhitelist"("brand", "maxUserId");

CREATE UNIQUE INDEX "MaxLinkCode_brand_code_key"
ON "MaxLinkCode"("brand", "code");

CREATE INDEX "MaxLinkCode_code_idx"
ON "MaxLinkCode"("code");

CREATE INDEX "MaxLinkCode_brand_userId_idx"
ON "MaxLinkCode"("brand", "userId");
