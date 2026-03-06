import express from "express";
import { PrismaClient } from "@prisma/client";
import { withAsync } from "../lib/http";
import { watchlistSchema } from "../schemas";
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

    return res.status(204).send();
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
