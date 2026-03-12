-- CreateTable: ContentBlock, TelegramWhitelist, TelegramLinkCode (required before add_perf_indexes).
-- Idempotent: CREATE TABLE IF NOT EXISTS so safe on existing DBs where tables were created via db push or earlier migration.

CREATE TABLE IF NOT EXISTS "ContentBlock" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "richJson" JSONB,
    "colorToken" TEXT,
    "fontVariant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fontWeight" TEXT,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContentBlock_page_key_key" ON "ContentBlock"("page", "key");

CREATE TABLE IF NOT EXISTS "TelegramWhitelist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramWhitelist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramWhitelist_userId_key" ON "TelegramWhitelist"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramWhitelist_telegramUserId_key" ON "TelegramWhitelist"("telegramUserId");
CREATE INDEX IF NOT EXISTS "TelegramWhitelist_telegramUserId_idx" ON "TelegramWhitelist"("telegramUserId");

CREATE TABLE IF NOT EXISTS "TelegramLinkCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLinkCode_code_key" ON "TelegramLinkCode"("code");
CREATE INDEX IF NOT EXISTS "TelegramLinkCode_code_idx" ON "TelegramLinkCode"("code");
CREATE INDEX IF NOT EXISTS "TelegramLinkCode_userId_idx" ON "TelegramLinkCode"("userId");
CREATE INDEX IF NOT EXISTS "TelegramLinkCode_expiresAt_idx" ON "TelegramLinkCode"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelegramWhitelist_userId_fkey') THEN
    ALTER TABLE "TelegramWhitelist" ADD CONSTRAINT "TelegramWhitelist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelegramLinkCode_userId_fkey') THEN
    ALTER TABLE "TelegramLinkCode" ADD CONSTRAINT "TelegramLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
