-- CreateTable: AdminNotificationEmail (per-brand notification mailbox for ADMIN users).

CREATE TABLE IF NOT EXISTS "AdminNotificationEmail" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'inner',
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminNotificationEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminNotificationEmail_brand_userId_key"
ON "AdminNotificationEmail"("brand", "userId");

CREATE INDEX IF NOT EXISTS "AdminNotificationEmail_brand_userId_idx"
ON "AdminNotificationEmail"("brand", "userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminNotificationEmail_userId_fkey') THEN
    ALTER TABLE "AdminNotificationEmail" ADD CONSTRAINT "AdminNotificationEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Перенос уже настроенных ящиков: раньше один notificationEmail действовал на все бренды,
-- поэтому при переносе копируем его в обе бренд-записи, чтобы поведение не изменилось для существующих админов.
INSERT INTO "AdminNotificationEmail" (id, brand, "userId", email, "updatedAt")
SELECT gen_random_uuid(), 'inner', id, "notificationEmail", now()
FROM "User"
WHERE "notificationEmail" IS NOT NULL AND "notificationEmail" != '';

INSERT INTO "AdminNotificationEmail" (id, brand, "userId", email, "updatedAt")
SELECT gen_random_uuid(), 'sprint-power', id, "notificationEmail", now()
FROM "User"
WHERE "notificationEmail" IS NOT NULL AND "notificationEmail" != '';

ALTER TABLE "User" DROP COLUMN IF EXISTS "notificationEmail";
