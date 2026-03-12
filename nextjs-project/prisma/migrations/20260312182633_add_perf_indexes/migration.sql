-- Add performance indexes
-- This migration is idempotent: indexes are created only if they don't exist.

-- Index on Order.status
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");

-- Index on Product.createdAt
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");

-- Index on Product.slug (non-unique)
CREATE INDEX IF NOT EXISTS "Product_slug_idx" ON "Product"("slug");

-- Unique index on Product.slug (already exists as constraint, but ensure)
-- Note: The @unique attribute already creates a unique constraint, which is implemented as a unique index.
-- This is just for completeness.
-- CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");

-- Index on Product.tildaUid
CREATE INDEX IF NOT EXISTS "Product_tildaUid_idx" ON "Product"("tildaUid");

-- Unique index on ContentBlock(page, key)
CREATE UNIQUE INDEX IF NOT EXISTS "ContentBlock_page_key_key" ON "ContentBlock"("page", "key");

-- Index on TelegramLinkCode.code (unique)
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLinkCode_code_key" ON "TelegramLinkCode"("code");
CREATE INDEX IF NOT EXISTS "TelegramLinkCode_code_idx" ON "TelegramLinkCode"("code");

-- Index on TelegramLinkCode.expiresAt
CREATE INDEX IF NOT EXISTS "TelegramLinkCode_expiresAt_idx" ON "TelegramLinkCode"("expiresAt");

-- Index on TelegramLinkCode.userId
CREATE INDEX IF NOT EXISTS "TelegramLinkCode_userId_idx" ON "TelegramLinkCode"("userId");

-- Index on TelegramWhitelist.telegramUserId (unique)
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramWhitelist_telegramUserId_key" ON "TelegramWhitelist"("telegramUserId");
CREATE INDEX IF NOT EXISTS "TelegramWhitelist_telegramUserId_idx" ON "TelegramWhitelist"("telegramUserId");

-- Unique index on TelegramWhitelist.userId
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramWhitelist_userId_key" ON "TelegramWhitelist"("userId");

-- Add column lastLoginAt to User if not exists (already added via db pull)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Fix PromoCode.id default (if needed)
-- The drift indicates default changed from gen_random_uuid() to none.
-- Since Prisma uses cuid() for id, we leave as is.
