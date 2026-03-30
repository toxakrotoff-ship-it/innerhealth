-- CreateTable
CREATE TABLE IF NOT EXISTS "ReviewModerationMessage" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewModerationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReviewModerationMessage_reviewId_idx" ON "ReviewModerationMessage"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewModerationMessage_reviewId_channel_recipientId_key" ON "ReviewModerationMessage"("reviewId", "channel", "recipientId");
