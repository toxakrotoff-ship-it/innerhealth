ALTER TABLE "SitePopup"
ADD COLUMN "brand" TEXT NOT NULL DEFAULT 'inner';

CREATE UNIQUE INDEX "SitePopup_brand_key" ON "SitePopup"("brand");
