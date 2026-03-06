-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Watchlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Watchlist" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Watchlist";
DROP TABLE "Watchlist";
ALTER TABLE "new_Watchlist" RENAME TO "Watchlist";
CREATE UNIQUE INDEX "Watchlist_name_key" ON "Watchlist"("name");
CREATE TABLE "new_WatchlistStock" (
    "watchlistId" INTEGER NOT NULL,
    "stockId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("watchlistId", "stockId"),
    CONSTRAINT "WatchlistStock_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchlistStock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WatchlistStock" ("addedAt", "stockId", "watchlistId") SELECT "addedAt", "stockId", "watchlistId" FROM "WatchlistStock";
DROP TABLE "WatchlistStock";
ALTER TABLE "new_WatchlistStock" RENAME TO "WatchlistStock";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
