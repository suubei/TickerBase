-- CreateTable
CREATE TABLE "Stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT,
    "summary" TEXT,
    "risk" TEXT,
    "catalyst" TEXT,
    "category" TEXT,
    "themeBenefit" TEXT,
    "themePhase" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stockId" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    CONSTRAINT "Report_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stockId" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WatchlistStock" (
    "watchlistId" INTEGER NOT NULL,
    "stockId" INTEGER NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("watchlistId", "stockId"),
    CONSTRAINT "WatchlistStock_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchlistStock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_ticker_key" ON "Stock"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Report_stockId_version_key" ON "Report"("stockId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Note_stockId_key" ON "Note"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_name_key" ON "Watchlist"("name");
