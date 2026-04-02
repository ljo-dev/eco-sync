-- CreateTable
CREATE TABLE "GhostScanResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "themeName" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DppCoverage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "coverageScore" REAL NOT NULL,
    "missingFields" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UcpCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "GhostScanResult_shop_idx" ON "GhostScanResult"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "DppCoverage_shop_productId_key" ON "DppCoverage"("shop", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "UcpCache_shop_key" ON "UcpCache"("shop");
