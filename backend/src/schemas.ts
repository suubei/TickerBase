import { z } from "zod";

export const importSchema = z.object({
  ticker: z.string().min(1).optional(),
  originalTicker: z.string().min(1).optional(),
  jsonPayload: z.union([z.string(), z.record(z.any())]),
  markdownReport: z.string().optional(),
  action: z.enum(["update", "skip"]).optional()
});

export const archiveSchema = z.object({
  archived: z.boolean()
});

export const watchlistSchema = z.object({
  name: z.string().min(1),
  tickers: z.array(z.string().min(1)).min(1)
});

export const watchlistAddStockSchema = z.object({
  ticker: z.string().min(1)
});

export const stockTagsSchema = z.object({
  themes: z.array(z.string().min(1)),
  categories: z.array(z.string().min(1))
});

export const themeSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional()
});

export const categorySchema = z.object({
  name: z.string().min(1)
});

export const tableFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  isVisible: z.boolean(),
  position: z.number().int().nonnegative()
});

export const tableFieldsUpdateSchema = z.object({
  fields: z.array(tableFieldSchema)
});

export const watchlistReorderSchema = z.object({
  ids: z.array(z.number().int().positive())
});

export const watchlistStocksReorderSchema = z.object({
  tickers: z.array(z.string().min(1))
});

export const reportCreateSchema = z.object({
  content: z.string().min(1)
});

export const reportUpdateSchema = z.object({
  content: z.string().min(1)
});
