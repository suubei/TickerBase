import express from "express";
import { PrismaClient } from "@prisma/client";
import { withAsync } from "../lib/http";
import { researchCreateSchema, researchUpdateSchema } from "../schemas";

type ResearchRoutesOptions = {
  prisma: PrismaClient;
};

const researchInclude = {
  stockLinks: {
    include: { stock: { select: { ticker: true } } }
  }
};

function mapResearchDto(r: {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  stockLinks: Array<{ stock: { ticker: string } }>;
}) {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    tickers: r.stockLinks.map((l) => l.stock.ticker),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

export function createResearchRoutes({ prisma }: ResearchRoutesOptions) {
  const router = express.Router();

  router.get("/research", withAsync(async (_req, res) => {
    const list = await prisma.research.findMany({
      include: researchInclude,
      orderBy: { updatedAt: "desc" }
    });
    res.json(list.map(mapResearchDto));
  }));

  router.post("/research", withAsync(async (req, res) => {
    const parsed = researchCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", detail: parsed.error.flatten() });
    }
    const { title, content, tickers } = parsed.data;

    const stocks = await prisma.stock.findMany({
      where: { ticker: { in: tickers.map((t) => t.toUpperCase()) } },
      select: { id: true }
    });

    const research = await prisma.research.create({
      data: {
        title,
        content,
        stockLinks: {
          create: stocks.map((s) => ({ stockId: s.id }))
        }
      },
      include: researchInclude
    });

    res.status(201).json(mapResearchDto(research));
  }));

  router.get("/research/:id", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const research = await prisma.research.findUnique({
      where: { id },
      include: researchInclude
    });
    if (!research) return res.status(404).json({ error: "Not found" });
    res.json(mapResearchDto(research));
  }));

  router.put("/research/:id", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const parsed = researchUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", detail: parsed.error.flatten() });
    }
    const { title, content, tickers } = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (title !== undefined || content !== undefined) {
        await tx.research.update({
          where: { id },
          data: {
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content })
          }
        });
      }
      if (tickers !== undefined) {
        await tx.researchStock.deleteMany({ where: { researchId: id } });
        const stocks = await tx.stock.findMany({
          where: { ticker: { in: tickers.map((t) => t.toUpperCase()) } },
          select: { id: true }
        });
        await tx.researchStock.createMany({
          data: stocks.map((s) => ({ researchId: id, stockId: s.id }))
        });
      }
    });

    const updated = await prisma.research.findUnique({
      where: { id },
      include: researchInclude
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(mapResearchDto(updated));
  }));

  router.delete("/research/:id", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    await prisma.research.delete({ where: { id } });
    res.status(204).send();
  }));

  return router;
}
