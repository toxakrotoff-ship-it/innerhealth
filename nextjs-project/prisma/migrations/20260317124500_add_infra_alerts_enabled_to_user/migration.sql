-- Add opt-in infra alerts flag for Admin users.
ALTER TABLE "User"
ADD COLUMN "infraAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;

