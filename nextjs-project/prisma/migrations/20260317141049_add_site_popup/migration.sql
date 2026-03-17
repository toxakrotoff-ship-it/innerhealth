-- CreateTable
CREATE TABLE "SitePopup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "richJson" JSONB,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "delaySeconds" INTEGER NOT NULL DEFAULT 5,
    "hideForDays" INTEGER NOT NULL DEFAULT 7,
    "autoCloseSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePopup_pkey" PRIMARY KEY ("id")
);
