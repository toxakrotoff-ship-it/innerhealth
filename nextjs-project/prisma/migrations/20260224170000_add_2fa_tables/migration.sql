-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorMethod" TEXT,
ADD COLUMN     "totpSecretEncrypted" TEXT;

-- CreateTable
CREATE TABLE "TwoFactorPending" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "emailCodeHash" TEXT,
    "emailCodeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorPending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorPending_userId_key" ON "TwoFactorPending"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorPending_userId_idx" ON "TwoFactorPending"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorPending_expiresAt_idx" ON "TwoFactorPending"("expiresAt");

-- CreateIndex
CREATE INDEX "TwoFactorGrant_userId_idx" ON "TwoFactorGrant"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorGrant_expiresAt_idx" ON "TwoFactorGrant"("expiresAt");

-- AddForeignKey
ALTER TABLE "TwoFactorPending" ADD CONSTRAINT "TwoFactorPending_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorGrant" ADD CONSTRAINT "TwoFactorGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
