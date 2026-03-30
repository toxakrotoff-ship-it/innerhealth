-- MaxWhitelist + MaxLinkCode (schema had models; tables were missing from migration history).

CREATE TABLE IF NOT EXISTS "MaxWhitelist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxUserId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxWhitelist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MaxWhitelist_userId_key" ON "MaxWhitelist"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "MaxWhitelist_maxUserId_key" ON "MaxWhitelist"("maxUserId");
CREATE INDEX IF NOT EXISTS "MaxWhitelist_maxUserId_idx" ON "MaxWhitelist"("maxUserId");

CREATE TABLE IF NOT EXISTS "MaxLinkCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxLinkCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MaxLinkCode_code_key" ON "MaxLinkCode"("code");
CREATE INDEX IF NOT EXISTS "MaxLinkCode_code_idx" ON "MaxLinkCode"("code");
CREATE INDEX IF NOT EXISTS "MaxLinkCode_userId_idx" ON "MaxLinkCode"("userId");
CREATE INDEX IF NOT EXISTS "MaxLinkCode_expiresAt_idx" ON "MaxLinkCode"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaxWhitelist_userId_fkey') THEN
    ALTER TABLE "MaxWhitelist" ADD CONSTRAINT "MaxWhitelist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaxLinkCode_userId_fkey') THEN
    ALTER TABLE "MaxLinkCode" ADD CONSTRAINT "MaxLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
