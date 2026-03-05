/*
  Warnings:

  - You are about to drop the column `category` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `Stock` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "StockTheme" (
    "stockId" INTEGER NOT NULL,
    "themeId" INTEGER NOT NULL,

    PRIMARY KEY ("stockId", "themeId"),
    CONSTRAINT "StockTheme_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockCategory" (
    "stockId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    PRIMARY KEY ("stockId", "categoryId"),
    CONSTRAINT "StockCategory_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT,
    "summary" TEXT,
    "risk" TEXT,
    "catalyst" TEXT,
    "themeBenefit" TEXT,
    "themePhase" INTEGER,
    "rawJson" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Stock" ("catalyst", "companyName", "createdAt", "id", "isArchived", "rawJson", "risk", "summary", "themeBenefit", "themePhase", "ticker", "updatedAt") SELECT "catalyst", "companyName", "createdAt", "id", "isArchived", "rawJson", "risk", "summary", "themeBenefit", "themePhase", "ticker", "updatedAt" FROM "Stock";
DROP TABLE "Stock";
ALTER TABLE "new_Stock" RENAME TO "Stock";
CREATE UNIQUE INDEX "Stock_ticker_key" ON "Stock"("ticker");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
