import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function pickString(input: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (typeof input[key] === "string") return input[key] as string;
  }
  return null;
}

export function extractStockFields(input: Record<string, unknown>) {
  return {
    companyName: pickString(input, "companyName", "company_name"),
    summary: pickString(input, "summary"),
    risk: pickString(input, "risk"),
    catalyst: pickString(input, "catalyst"),
    themeBenefit: pickString(input, "themeBenefit", "theme_benefit"),
    themePhase: pickString(input, "themePhase", "theme_phase"),
    rawJson: JSON.stringify(input)
  };
}

export function extractNameList(input: unknown): string[] {
  if (typeof input === "string") {
    return [...new Set(input.split(",").map((item) => item.trim()).filter(Boolean))];
  }
  if (Array.isArray(input)) {
    return [
      ...new Set(
        input
          .filter((item) => typeof item === "string")
          .map((item) => (item as string).trim())
          .filter(Boolean)
      )
    ];
  }
  return [];
}

export async function ensureReportsDir(reportsDir: string) {
  await fs.mkdir(reportsDir, { recursive: true });
}

export async function writeReportFile(reportsDir: string, ticker: string, version: number, markdown: string): Promise<string> {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${ticker}_${ts}_v${version}.md`;
  const absolutePath = path.join(reportsDir, fileName);
  await fs.writeFile(absolutePath, markdown, "utf-8");
  return absolutePath;
}

export function getStockWhereFromQuery(query: express.Request["query"]): Prisma.StockWhereInput {
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const theme = typeof query.theme === "string" ? query.theme.trim() : "";
  const category = typeof query.category === "string" ? query.category.trim() : "";
  const watchlist = typeof query.watchlist === "string" ? query.watchlist.trim() : "";
  const archived = typeof query.archived === "string" ? query.archived : "all";

  const where: Prisma.StockWhereInput = {};

  if (archived === "active") where.isArchived = false;
  if (archived === "archived") where.isArchived = true;

  if (search) {
    where.OR = [
      { ticker: { contains: search } },
      { companyName: { contains: search } },
      { summary: { contains: search } }
    ];
  }

  if (theme) {
    where.themeLinks = {
      some: {
        theme: { name: theme }
      }
    };
  }

  if (category) {
    where.categoryLinks = {
      some: {
        category: { name: category }
      }
    };
  }

  if (watchlist) {
    where.watchlistStocks = {
      some: {
        watchlist: { name: watchlist }
      }
    };
  }

  return where;
}

export function getStockOrderByFromQuery(query: express.Request["query"]): Prisma.StockOrderByWithRelationInput {
  const sortKey = typeof query.sortKey === "string" ? query.sortKey : "updatedAt";
  const sortOrder = typeof query.sortOrder === "string" && query.sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

  const allowed: Array<keyof Prisma.StockOrderByWithRelationInput> = [
    "ticker",
    "companyName",
    "summary",
    "themeBenefit",
    "themePhase",
    "catalyst",
    "risk",
    "updatedAt",
    "createdAt"
  ];

  const key = allowed.includes(sortKey as keyof Prisma.StockOrderByWithRelationInput)
    ? (sortKey as keyof Prisma.StockOrderByWithRelationInput)
    : "updatedAt";

  return { [key]: sortOrder };
}

export function mapStockDto(stock: {
  reports: Array<{ id: number; stockId: number; filePath: string; generatedAt: Date; version: number }>;
  watchlistStocks: Array<{ watchlist: { name: string } }>;
  themeLinks: Array<{ theme: { name: string } }>;
  categoryLinks: Array<{ category: { name: string } }>;
} & Record<string, unknown>) {
  return {
    ...stock,
    themes: stock.themeLinks.map((item) => item.theme.name),
    categories: stock.categoryLinks.map((item) => item.category.name),
    latestReport: stock.reports[0] ?? null,
    watchlists: stock.watchlistStocks.map((m) => m.watchlist.name)
  };
}

export async function getJsonKeysFromStocks(prisma: PrismaClient): Promise<string[]> {
  const stocks = await prisma.stock.findMany({
    where: { rawJson: { not: null } },
    select: { rawJson: true }
  });

  const keys = new Set<string>();
  for (const stock of stocks) {
    if (!stock.rawJson) continue;
    try {
      const parsed = JSON.parse(stock.rawJson) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        keys.add(key);
      }
    } catch {
      continue;
    }
  }

  return [...keys].sort((a, b) => a.localeCompare(b));
}
