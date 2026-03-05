import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 3000);
const reportsDir = path.resolve(process.cwd(), "reports");

type AsyncHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => Promise<unknown>;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

const importSchema = z.object({
  ticker: z.string().min(1),
  originalTicker: z.string().min(1).optional(),
  jsonPayload: z.union([z.string(), z.record(z.any())]),
  markdownReport: z.string().min(1),
  action: z.enum(["update", "skip"]).optional()
});

const archiveSchema = z.object({
  archived: z.boolean()
});

const watchlistSchema = z.object({
  name: z.string().min(1),
  tickers: z.array(z.string().min(1)).min(1)
});

const stockTagsSchema = z.object({
  themes: z.array(z.string().min(1)),
  categories: z.array(z.string().min(1))
});

const themeSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional()
});

const categorySchema = z.object({
  name: z.string().min(1)
});

const tableFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  isVisible: z.boolean(),
  position: z.number().int().nonnegative()
});

const tableFieldsUpdateSchema = z.object({
  fields: z.array(tableFieldSchema)
});

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function extractStockFields(input: Record<string, unknown>) {
  return {
    companyName: typeof input.company_name === "string" ? input.company_name : null,
    summary: typeof input.summary === "string" ? input.summary : null,
    risk: typeof input.risk === "string" ? input.risk : null,
    catalyst: typeof input.catalyst === "string" ? input.catalyst : null,
    themeBenefit: typeof input.theme_benefit === "string" ? input.theme_benefit : null,
    themePhase: typeof input.theme_phase === "number" ? input.theme_phase : null,
    rawJson: JSON.stringify(input)
  };
}

function extractNameList(input: unknown): string[] {
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

async function ensureReportsDir() {
  await fs.mkdir(reportsDir, { recursive: true });
}

async function writeReportFile(ticker: string, version: number, markdown: string): Promise<string> {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${ticker}_${ts}_v${version}.md`;
  const absolutePath = path.join(reportsDir, fileName);
  await fs.writeFile(absolutePath, markdown, "utf-8");
  return absolutePath;
}

function withAsync(handler: AsyncHandler) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}

function getStockWhereFromQuery(query: express.Request["query"]): Prisma.StockWhereInput {
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
    where.stockThemes = {
      some: {
        theme: { name: theme }
      }
    };
  }

  if (category) {
    where.stockCategories = {
      some: {
        category: { name: category }
      }
    };
  }

  if (watchlist) {
    where.memberships = {
      some: {
        watchlist: { name: watchlist }
      }
    };
  }

  return where;
}

function getStockOrderByFromQuery(query: express.Request["query"]): Prisma.StockOrderByWithRelationInput {
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

function mapStockDto(stock: {
  reports: Array<{ id: number; stockId: number; filePath: string; generatedAt: Date; version: number }>;
  memberships: Array<{ watchlist: { name: string } }>;
  stockThemes: Array<{ theme: { name: string } }>;
  stockCategories: Array<{ category: { name: string } }>;
} & Record<string, unknown>) {
  return {
    ...stock,
    themes: stock.stockThemes.map((item) => item.theme.name),
    categories: stock.stockCategories.map((item) => item.category.name),
    latestReport: stock.reports[0] ?? null,
    watchlists: stock.memberships.map((m) => m.watchlist.name)
  };
}

async function getJsonKeysFromStocks(): Promise<string[]> {
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/stocks/import", withAsync(async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", detail: parsed.error.flatten() });
  }

  const ticker = normalizeTicker(parsed.data.ticker);
  const originalTicker = parsed.data.originalTicker ? normalizeTicker(parsed.data.originalTicker) : ticker;
  const isEditRequest = Boolean(parsed.data.originalTicker);
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
  const nextVersion = (latestReport?.version ?? 0) + 1;
  await ensureReportsDir();
  const filePath = await writeReportFile(ticker, nextVersion, parsed.data.markdownReport);

  await prisma.report.create({
    data: {
      stockId: stock.id,
      filePath,
      version: nextVersion,
      generatedAt: new Date()
    }
  });

  return res.json({
    ticker,
    updated,
    version: nextVersion,
    generatedAt: new Date().toISOString()
  });
}));

app.get("/api/stocks", withAsync(async (req, res) => {
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
        memberships: {
          include: {
            watchlist: true
          }
        },
        stockThemes: {
          include: {
            theme: true
          }
        },
        stockCategories: {
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

app.get("/api/stocks/tickers", withAsync(async (req, res) => {
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

app.patch("/api/stocks/:ticker/archive", withAsync(async (req, res) => {
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

app.patch("/api/stocks/:ticker/tags", withAsync(async (req, res) => {
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
      stockThemes: { include: { theme: true } },
      stockCategories: { include: { category: true } }
    }
  });

  res.json({
    ticker,
    themes: updated?.stockThemes.map((item) => item.theme.name) ?? [],
    categories: updated?.stockCategories.map((item) => item.category.name) ?? []
  });
}));

app.get("/api/stocks/:ticker/reports", withAsync(async (req, res) => {
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

app.get("/api/reports/:id/content", withAsync(async (req, res) => {
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

app.get("/api/watchlists", withAsync(async (_req, res) => {
  const watchlists = await prisma.watchlist.findMany({
    include: {
      stocks: {
        include: {
          stock: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(
    watchlists.map((w) => ({
      id: w.id,
      name: w.name,
      createdAt: w.createdAt,
      tickers: w.stocks.map((s) => s.stock.ticker)
    }))
  );
}));

app.post("/api/watchlists", withAsync(async (req, res) => {
  const parsed = watchlistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const name = parsed.data.name.trim();
  if (!name) {
    return res.status(400).json({ error: "Watchlist name is required" });
  }

  const existingWatchlist = await prisma.watchlist.findUnique({ where: { name } });
  if (existingWatchlist) {
    return res.status(409).json({ error: "Watchlist name already exists" });
  }

  const tickers = [...new Set(parsed.data.tickers.map(normalizeTicker))];
  const stocks = await prisma.stock.findMany({ where: { ticker: { in: tickers } } });
  if (!stocks.length) {
    return res.status(400).json({ error: "No valid tickers found" });
  }

  const watchlist = await prisma.watchlist.create({
    data: {
      name,
      stocks: {
        create: stocks.map((stock) => ({ stockId: stock.id }))
      }
    },
    include: {
      stocks: {
        include: {
          stock: true
        }
      }
    }
  });

  res.status(201).json({
    id: watchlist.id,
    name: watchlist.name,
    tickers: watchlist.stocks.map((s) => s.stock.ticker)
  });
}));

app.delete("/api/watchlists/:id/stocks/:ticker", withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const ticker = normalizeTicker(req.params.ticker);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid watchlist id" });
  }

  const watchlist = await prisma.watchlist.findUnique({ where: { id } });
  if (!watchlist) {
    return res.status(404).json({ error: "Watchlist not found" });
  }

  const stock = await prisma.stock.findUnique({ where: { ticker } });
  if (!stock) {
    return res.status(404).json({ error: "Stock not found" });
  }

  await prisma.watchlistStock.deleteMany({
    where: {
      watchlistId: id,
      stockId: stock.id
    }
  });

  return res.status(204).send();
}));

app.delete("/api/watchlists/:id", withAsync(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid watchlist id" });
  }

  const watchlist = await prisma.watchlist.findUnique({ where: { id } });
  if (!watchlist) {
    return res.status(404).json({ error: "Watchlist not found" });
  }

  await prisma.watchlist.delete({ where: { id } });
  return res.status(204).send();
}));

app.get("/api/settings", withAsync(async (_req, res) => {
  const [themes, categories, tableFields, jsonKeys] = await Promise.all([
    prisma.theme.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tableFieldConfig.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
    getJsonKeysFromStocks()
  ]);

  res.json({ themes, categories, tableFields, jsonKeys });
}));

app.post("/api/settings/themes", withAsync(async (req, res) => {
  const parsed = themeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const theme = await prisma.theme.create({
    data: {
      name: parsed.data.name.trim(),
      color: parsed.data.color?.trim() || "#9CA3AF"
    }
  });

  res.status(201).json(theme);
}));

app.put("/api/settings/themes/:id", withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = themeSchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const theme = await prisma.theme.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      color: parsed.data.color?.trim() || "#9CA3AF"
    }
  });

  res.json(theme);
}));

app.delete("/api/settings/themes/:id", withAsync(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  await prisma.theme.delete({ where: { id } });
  res.status(204).send();
}));

app.post("/api/settings/categories", withAsync(async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const category = await prisma.category.create({
    data: { name: parsed.data.name.trim() }
  });

  res.status(201).json(category);
}));

app.put("/api/settings/categories/:id", withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = categorySchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const category = await prisma.category.update({
    where: { id },
    data: { name: parsed.data.name.trim() }
  });

  res.json(category);
}));

app.delete("/api/settings/categories/:id", withAsync(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  await prisma.category.delete({ where: { id } });
  res.status(204).send();
}));

app.put("/api/settings/table-fields", withAsync(async (req, res) => {
  const parsed = tableFieldsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  await prisma.$transaction(async (tx) => {
    const incomingKeys = parsed.data.fields.map((item) => item.key);
    await tx.tableFieldConfig.deleteMany({
      where: { key: { notIn: incomingKeys } }
    });

    for (const item of parsed.data.fields) {
      await tx.tableFieldConfig.upsert({
        where: { key: item.key },
        create: item,
        update: {
          label: item.label,
          isVisible: item.isVisible,
          position: item.position
        }
      });
    }
  });

  const tableFields = await prisma.tableFieldConfig.findMany({
    orderBy: [{ position: "asc" }, { id: "asc" }]
  });

  res.json(tableFields);
}));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
