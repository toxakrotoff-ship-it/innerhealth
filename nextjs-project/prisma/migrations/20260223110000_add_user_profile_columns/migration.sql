-- AlterTable: add profile columns to User (lastName, phone, notificationEmail).
-- Required for Prisma schema; prod DB may have been created before these were in migrations.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationEmail" TEXT;
