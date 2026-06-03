-- CreateTable
CREATE TABLE "DiscoveryInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "sortBy" TEXT NOT NULL DEFAULT 'hot',
    "payload" TEXT NOT NULL,
    "snapshotIds" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DiscoveryInsight_source_period_sortBy_generatedAt_idx" ON "DiscoveryInsight"("source", "period", "sortBy", "generatedAt");
