import express from "express";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { withAsync } from "../lib/http";
import { archiveSchema, importSchema, reportCreateSchema, reportUpdateSchema, stockTagsSchema } from "../schemas";
import {
  ensureReportsDir,
  extractNameList,
  extractStockFields,
  getStockOrderByFromQuery,
  getStockWhereFromQuery,
  mapStockDto,
  normalizeTicker,
  writeReportFile
} from "../services/stockService";

type StocksRoutesOptions = {
  prisma: PrismaClient;
  reportsDir: string;
};

export function createStocksRoutes({ prisma, reportsDir }: StocksRoutesOptions) {
  const router = express.Router();

  router.post("/stocks/import", withAsync(async (req, res) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", detail: parsed.error.flatten() });
    }

    let payloadObj: Record<string, unknown> | null = null;
    if (typeof parsed.data.jsonPayload === "string") {
      try {
        const parsedPayload = JSON.parse(parsed.data.jsonPayload);
        if (typeof parsedPayload === "object" && parsedPayload !== null && !Array.isArray(parsedPayload)) {
          payloadObj = parsedPayload as Record<string, unknown>;
        }
      } catch {
        return res.status(400).json({ error: "jsonPayload is not valid JSON" });
      }
    } else {
      payloadObj = parsed.data.jsonPayload as Record<string, unknown>;
    }

    if (!payloadObj) {
      return res.status(400).json({ error: "jsonPayload must be a JSON object" });
    }

    const payloadTicker = typeof payloadObj.ticker === "string" ? payloadObj.ticker : "";
    const resolvedTicker = payloadTicker || parsed.data.ticker || "";
    if (!resolvedTicker.trim()) {
      return res.status(400).json({ error: "Ticker is required in jsonPayload.ticker or payload.ticker" });
    }

    const ticker = normalizeTicker(resolvedTicker);
    const originalTicker = parsed.data.originalTicker ? normalizeTicker(parsed.data.originalTicker) : ticker;
    const isEditRequest = Boolean(parsed.data.originalTicker);

    const fields = extractStockFields(payloadObj);
    let updated = false;
    let stock;

    if (isEditRequest) {
      const existingByOriginal = await prisma.stock.findUnique({ where: { ticker: originalTicker } });
      if (!existingByOriginal) {
        return res.status(404).json({ error: `Original ticker ${originalTicker} not found` });
      }

      const existingByTarget = await prisma.stock.findUnique({ where: { ticker } });
      if (existingByTarget && existingByTarget.id !== existingByOriginal.id) {
        return res.status(409).json({ error: `Ticker ${ticker} already exists` });
      }

      stock = await prisma.stock.update({
        where: { id: existingByOriginal.id },
        data: { ticker, ...fields }
      });
      updated = true;
    } else {
      const existing = await prisma.stock.findUnique({ where: { ticker } });
      if (existing && !parsed.data.action) {
        return res.status(409).json({ exists: true, message: `Ticker ${ticker} already exists` });
      }
      if (existing && parsed.data.action === "skip") {
        return res.json({ skipped: true, ticker });
      }

      stock = existing
        ? await prisma.stock.update({ where: { ticker }, data: fields })
        : await prisma.stock.create({ data: { ticker, ...fields } });
      updated = Boolean(existing);
    }

    const themeNames = extractNameList(payloadObj.theme);
    const categoryNames = extractNameList(payloadObj.category);

    if (themeNames.length > 0 || categoryNames.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.stockTheme.deleteMany({ where: { stockId: stock.id } });
        await tx.stockCategory.deleteMany({ where: { stockId: stock.id } });

        for (const themeName of themeNames) {
          const theme = await tx.theme.upsert({
            where: { name: themeName },
            create: { name: themeName },
            update: {}
          });
          await tx.stockTheme.create({
            data: {
              stockId: stock.id,
              themeId: theme.id
            }
          });
        }

        for (const categoryName of categoryNames) {
          const category = await tx.category.upsert({
            where: { name: categoryName },
            create: { name: categoryName },
            update: {}
          });
          await tx.stockCategory.create({
            data: {
              stockId: stock.id,
              categoryId: category.id
            }
          });
        }
      });
    }

    const latestReport = await prisma.report.findFirst({
      where: { stockId: stock.id },
      orderBy: { version: "desc" }
    });
    let nextVersion = latestReport?.version ?? 0;
    if (typeof parsed.data.markdownReport === "string" && parsed.data.markdownReport.trim()) {
      nextVersion += 1;
      await ensureReportsDir(reportsDir);
      const filePath = await writeReportFile(reportsDir, ticker, nextVersion, parsed.data.markdownReport);

      await prisma.report.create({
        data: {
          stockId: stock.id,
          filePath,
          version: nextVersion,
          generatedAt: new Date()
        }
      });
    }

    return res.json({
      ticker,
      updated,
      version: nextVersion,
      generatedAt: new Date().toISOString()
    });
  }));

  router.get("/stocks", withAsync(async (req, res) => {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(200, Math.max(1, Number.parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const where = getStockWhereFromQuery(req.query);
    const orderBy = getStockOrderByFromQuery(req.query);

    const [total, stocks] = await Promise.all([
      prisma.stock.count({ where }),
      prisma.stock.findMany({
        where,
        include: {
          reports: {
            orderBy: { version: "desc" },
            take: 1
          },
          watchlistStocks: {
            include: {
              watchlist: true
            }
          },
          themeLinks: {
            include: {
              theme: true
            }
          },
          categoryLinks: {
            include: {
              category: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    res.json({
      items: stocks.map(mapStockDto),
      total,
      page,
      pageSize
    });
  }));

  router.get("/stocks/tickers", withAsync(async (req, res) => {
    const where = getStockWhereFromQuery(req.query);
    const stocks = await prisma.stock.findMany({
      where,
      select: { ticker: true }
    });

    res.json({
      tickers: stocks.map((item) => item.ticker),
      total: stocks.length
    });
  }));

  router.patch("/stocks/:ticker/archive", withAsync(async (req, res) => {
    const ticker = normalizeTicker(req.params.ticker);
    const parsed = archiveSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const existing = await prisma.stock.findUnique({ where: { ticker } });
    if (!existing) {
      return res.status(404).json({ error: "Ticker not found" });
    }

    const updated = await prisma.stock.update({
      where: { ticker },
      data: { isArchived: parsed.data.archived }
    });

    res.json(updated);
  }));

  router.patch("/stocks/:ticker/tags", withAsync(async (req, res) => {
    const ticker = normalizeTicker(req.params.ticker);
    const parsed = stockTagsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const stock = await prisma.stock.findUnique({ where: { ticker } });
    if (!stock) {
      return res.status(404).json({ error: "Ticker not found" });
    }

    const themeNames = [...new Set(parsed.data.themes.map((item) => item.trim()).filter(Boolean))];
    const categoryNames = [...new Set(parsed.data.categories.map((item) => item.trim()).filter(Boolean))];

    await prisma.$transaction(async (tx) => {
      await tx.stockTheme.deleteMany({ where: { stockId: stock.id } });
      await tx.stockCategory.deleteMany({ where: { stockId: stock.id } });

      for (const themeName of themeNames) {
        const theme = await tx.theme.upsert({
          where: { name: themeName },
          create: { name: themeName },
          update: {}
        });
        await tx.stockTheme.create({
          data: {
            stockId: stock.id,
            themeId: theme.id
          }
        });
      }

      for (const categoryName of categoryNames) {
        const category = await tx.category.upsert({
          where: { name: categoryName },
          create: { name: categoryName },
          update: {}
        });
        await tx.stockCategory.create({
          data: {
            stockId: stock.id,
            categoryId: category.id
          }
        });
      }
    });

    const updated = await prisma.stock.findUnique({
      where: { ticker },
      include: {
        themeLinks: { include: { theme: true } },
        categoryLinks: { include: { category: true } }
      }
    });

    res.json({
      ticker,
      themes: updated?.themeLinks.map((item) => item.theme.name) ?? [],
      categories: updated?.categoryLinks.map((item) => item.category.name) ?? []
    });
  }));

  router.get("/stocks/:ticker/reports", withAsync(async (req, res) => {
    const ticker = normalizeTicker(req.params.ticker);
    const stock = await prisma.stock.findUnique({ where: { ticker } });
    if (!stock) {
      return res.status(404).json({ error: "Ticker not found" });
    }

    const reports = await prisma.report.findMany({
      where: { stockId: stock.id },
      orderBy: { version: "desc" }
    });

    res.json(reports);
  }));

  router.get("/reports/:id/content", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid report id" });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const content = await fs.readFile(report.filePath, "utf-8");
    res.json({ content, generatedAt: report.generatedAt, version: report.version });
  }));

  router.post("/stocks/:ticker/reports", withAsync(async (req, res) => {
    const ticker = normalizeTicker(req.params.ticker);
    const parsed = reportCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", detail: parsed.error.flatten() });
    }

    const stock = await prisma.stock.findUnique({ where: { ticker } });
    if (!stock) {
      return res.status(404).json({ error: "Ticker not found" });
    }

    const latestReport = await prisma.report.findFirst({
      where: { stockId: stock.id },
      orderBy: { version: "desc" }
    });
    const nextVersion = (latestReport?.version ?? 0) + 1;

    await ensureReportsDir(reportsDir);
    const filePath = await writeReportFile(reportsDir, ticker, nextVersion, parsed.data.content);
    const created = await prisma.report.create({
      data: {
        stockId: stock.id,
        filePath,
        version: nextVersion,
        generatedAt: new Date()
      }
    });

    res.status(201).json(created);
  }));

  router.delete("/reports/:id", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid report id" });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    await prisma.report.delete({ where: { id } });
    await fs.unlink(report.filePath).catch(() => {});
    res.status(204).end();
  }));

  router.put("/reports/:id/content", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid report id" });
    }

    const parsed = reportUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", detail: parsed.error.flatten() });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    await fs.writeFile(report.filePath, parsed.data.content, "utf-8");
    const updated = await prisma.report.update({
      where: { id },
      data: { generatedAt: new Date() }
    });

    res.json({
      id: updated.id,
      version: updated.version,
      generatedAt: updated.generatedAt,
      content: parsed.data.content
    });
  }));

  return router;
}
