-- CreateTable
CREATE TABLE "CdekOfficeCache" (
    "id" TEXT NOT NULL,
    "regionCode" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CdekOfficeCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CdekTariffCache" (
    "id" TEXT NOT NULL,
    "toCityCode" INTEGER NOT NULL,
    "tariffCode" INTEGER NOT NULL,
    "weightBucketG" INTEGER NOT NULL,
    "deliverySum" DOUBLE PRECISION NOT NULL,
    "periodMin" INTEGER NOT NULL,
    "periodMax" INTEGER NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CdekTariffCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CdekCacheSyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "regionsTotal" INTEGER NOT NULL DEFAULT 0,
    "regionsOk" INTEGER NOT NULL DEFAULT 0,
    "regionsFailed" INTEGER NOT NULL DEFAULT 0,
    "tariffCitiesTotal" INTEGER NOT NULL DEFAULT 0,
    "tariffCitiesOk" INTEGER NOT NULL DEFAULT 0,
    "tariffCitiesFailed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "CdekCacheSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CdekOfficeCache_regionCode_key" ON "CdekOfficeCache"("regionCode");

-- CreateIndex
CREATE INDEX "CdekOfficeCache_updatedAt_idx" ON "CdekOfficeCache"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CdekTariffCache_toCityCode_tariffCode_weightBucketG_key" ON "CdekTariffCache"("toCityCode", "tariffCode", "weightBucketG");

-- CreateIndex
CREATE INDEX "CdekTariffCache_updatedAt_idx" ON "CdekTariffCache"("updatedAt");

-- CreateIndex
CREATE INDEX "CdekCacheSyncRun_startedAt_idx" ON "CdekCacheSyncRun"("startedAt");
