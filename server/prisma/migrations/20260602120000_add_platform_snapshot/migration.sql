-- CreateTable
CREATE TABLE "PlatformSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "timeWindow" TEXT NOT NULL,
    "sortBy" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'trending',
    "payload" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PlatformSnapshot_source_timeWindow_sortBy_fetchedAt_idx" ON "PlatformSnapshot"("source", "timeWindow", "sortBy", "fetchedAt");
