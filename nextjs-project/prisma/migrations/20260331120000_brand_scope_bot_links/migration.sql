ALTER TABLE "TelegramWhitelist"
ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "TelegramLinkCode"
ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "MaxWhitelist"
ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

ALTER TABLE "MaxLinkCode"
ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT 'inner';

DROP INDEX IF EXISTS "TelegramWhitelist_userId_key";
DROP INDEX IF EXISTS "TelegramWhitelist_telegramUserId_key";
DROP INDEX IF EXISTS "MaxWhitelist_userId_key";
DROP INDEX IF EXISTS "MaxWhitelist_maxUserId_key";
DROP INDEX IF EXISTS "TelegramLinkCode_code_key";
DROP INDEX IF EXISTS "MaxLinkCode_code_key";
DROP INDEX IF EXISTS "TelegramLinkCode_code_idx";
DROP INDEX IF EXISTS "MaxLinkCode_code_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramWhitelist_brand_userId_key"
ON "TelegramWhitelist"("brand", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramWhitelist_brand_telegramUserId_key"
ON "TelegramWhitelist"("brand", "telegramUserId");

CREATE INDEX IF NOT EXISTS "TelegramWhitelist_brand_userId_idx"
ON "TelegramWhitelist"("brand", "userId");

CREATE INDEX IF NOT EXISTS "TelegramWhitelist_brand_telegramUserId_idx"
ON "TelegramWhitelist"("brand", "telegramUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLinkCode_brand_code_key"
ON "TelegramLinkCode"("brand", "code");

CREATE INDEX IF NOT EXISTS "TelegramLinkCode_code_idx"
ON "TelegramLinkCode"("code");

CREATE INDEX IF NOT EXISTS "TelegramLinkCode_brand_userId_idx"
ON "TelegramLinkCode"("brand", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "MaxWhitelist_brand_userId_key"
ON "MaxWhitelist"("brand", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "MaxWhitelist_brand_maxUserId_key"
ON "MaxWhitelist"("brand", "maxUserId");

CREATE INDEX IF NOT EXISTS "MaxWhitelist_brand_userId_idx"
ON "MaxWhitelist"("brand", "userId");

CREATE INDEX IF NOT EXISTS "MaxWhitelist_brand_maxUserId_idx"
ON "MaxWhitelist"("brand", "maxUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "MaxLinkCode_brand_code_key"
ON "MaxLinkCode"("brand", "code");

CREATE INDEX IF NOT EXISTS "MaxLinkCode_code_idx"
ON "MaxLinkCode"("code");

CREATE INDEX IF NOT EXISTS "MaxLinkCode_brand_userId_idx"
ON "MaxLinkCode"("brand", "userId");
