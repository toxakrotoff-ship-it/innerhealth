ALTER TABLE "Order"
ADD COLUMN "cdekTrackAdminEmailAttemptedAt" TIMESTAMP(3),
ADD COLUMN "cdekTrackAdminEmailSentAt" TIMESTAMP(3),
ADD COLUMN "cdekTrackCustomerEmailAttemptedAt" TIMESTAMP(3),
ADD COLUMN "cdekTrackCustomerEmailSentAt" TIMESTAMP(3),
ADD COLUMN "cdekTrackAdminEmailError" TEXT,
ADD COLUMN "cdekTrackCustomerEmailError" TEXT;

-- Existing tracks may already have produced notifications. Mark them delivered so
-- rolling out the retry worker cannot resend the full historical backlog.
UPDATE "Order"
SET
  "cdekTrackAdminEmailSentAt" = COALESCE("cdekTrackCheckedAt", "updatedAt"),
  "cdekTrackCustomerEmailSentAt" = COALESCE("cdekTrackCheckedAt", "updatedAt")
WHERE "cdekTrackNumber" IS NOT NULL;
