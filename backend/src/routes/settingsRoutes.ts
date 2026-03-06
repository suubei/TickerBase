import express from "express";
import { PrismaClient } from "@prisma/client";
import { withAsync } from "../lib/http";
import { categorySchema, tableFieldsUpdateSchema, themeSchema } from "../schemas";
import { getJsonKeysFromStocks } from "../services/stockService";

type SettingsRoutesOptions = {
  prisma: PrismaClient;
};

export function createSettingsRoutes({ prisma }: SettingsRoutesOptions) {
  const router = express.Router();

  router.get("/settings", withAsync(async (_req, res) => {
    const [themes, categories, tableFields, jsonKeys] = await Promise.all([
      prisma.theme.findMany({ orderBy: { name: "asc" } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.tableFieldConfig.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
      getJsonKeysFromStocks(prisma)
    ]);

    res.json({ themes, categories, tableFields, jsonKeys });
  }));

  router.post("/settings/themes", withAsync(async (req, res) => {
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

  router.put("/settings/themes/:id", withAsync(async (req, res) => {
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

  router.delete("/settings/themes/:id", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }

    await prisma.theme.delete({ where: { id } });
    res.status(204).send();
  }));

  router.post("/settings/categories", withAsync(async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const category = await prisma.category.create({
      data: { name: parsed.data.name.trim() }
    });

    res.status(201).json(category);
  }));

  router.put("/settings/categories/:id", withAsync(async (req, res) => {
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

  router.delete("/settings/categories/:id", withAsync(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }

    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  }));

  router.put("/settings/table-fields", withAsync(async (req, res) => {
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

  return router;
}
