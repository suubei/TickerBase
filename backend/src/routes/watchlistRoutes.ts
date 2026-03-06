import express from "express";
import { PrismaClient } from "@prisma/client";
import { withAsync } from "../lib/http";
import { watchlistAddStockSchema, watchlistReorderSchema, watchlistSchema, watchlistStocksReorderSchema } from "../schemas";
import { normalizeTicker } from "../services/stockService";

type WatchlistRoutesOptions = {
  prisma: PrismaClient;
};

export function createWatchlistRoutes({ prisma }: WatchlistRoutesOptions) {
  const router = express.Router();

  router.get("/watchlists", withAsync(async (_req, res) => {
    const watchlists = await prisma.watchlist.findMany({
      include: {
        stocks: {
          include: { stock: true },
          orderBy: { position: "asc" }
        }
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
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

  router.patch("/watchlists/reorder", withAsync(async (req, res) => {
    const parsed = watchlistReorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    await prisma.$transaction(
      parsed.data.ids.map((id, index) =>
        prisma.watchlist.update({ where: { id }, data: { position: index } })
      )
    );
    res.status(204).end();
  }));

  router.patch("/watchlists/:id/stocks/reorder", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid watchlist id" });
    }
    const parsed = watchlistStocksReorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const stocks = await prisma.stock.findMany({
      where: { ticker: { in: parsed.data.tickers } },
      select: { id: true, ticker: true }
    });
    const tickerToId = new Map(stocks.map((s) => [s.ticker, s.id]));
    await prisma.$transaction(
      parsed.data.tickers.flatMap((ticker, index) => {
        const stockId = tickerToId.get(ticker);
        if (!stockId) return [];
        return [prisma.watchlistStock.update({
          where: { watchlistId_stockId: { watchlistId: id, stockId } },
          data: { position: index }
        })];
      })
    );
    res.status(204).end();
  }));

  router.post("/watchlists", withAsync(async (req, res) => {
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

    const maxPos = await prisma.watchlist.findFirst({
      orderBy: { position: "desc" },
      select: { position: true }
    });
    const nextPosition = (maxPos?.position ?? -1) + 1;

    const watchlist = await prisma.watchlist.create({
      data: {
        name,
        position: nextPosition,
        stocks: {
          create: stocks.map((stock, index) => ({ stockId: stock.id, position: index }))
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

  router.delete("/watchlists/:id/stocks/:ticker", withAsync(async (req, res) => {
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

    const remainingCount = await prisma.watchlistStock.count({
      where: { watchlistId: id }
    });
    if (remainingCount === 0) {
      await prisma.watchlist.delete({ where: { id } });
    }

    return res.status(204).send();
  }));

  router.post("/watchlists/:id/stocks", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid watchlist id" });
    }

    const parsed = watchlistAddStockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const watchlist = await prisma.watchlist.findUnique({ where: { id } });
    if (!watchlist) {
      return res.status(404).json({ error: "Watchlist not found" });
    }

    const ticker = normalizeTicker(parsed.data.ticker);
    const stock = await prisma.stock.findUnique({ where: { ticker } });
    if (!stock) {
      return res.status(404).json({ error: "Stock not found" });
    }

    const exists = await prisma.watchlistStock.findUnique({
      where: {
        watchlistId_stockId: {
          watchlistId: id,
          stockId: stock.id
        }
      }
    });
    if (exists) {
      return res.status(409).json({ error: "Stock already in watchlist" });
    }

    const maxStockPos = await prisma.watchlistStock.findFirst({
      where: { watchlistId: id },
      orderBy: { position: "desc" },
      select: { position: true }
    });
    const nextStockPos = (maxStockPos?.position ?? -1) + 1;

    await prisma.watchlistStock.create({
      data: {
        watchlistId: id,
        stockId: stock.id,
        position: nextStockPos
      }
    });

    return res.status(201).json({ id, ticker });
  }));

  router.delete("/watchlists/:id", withAsync(async (req, res) => {
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

  return router;
}
