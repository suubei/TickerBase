import type { Stock } from "../types";

export type CoreColumnKey =
  | "ticker"
  | "category"
  | "summary"
  | "theme"
  | "themeBenefit"
  | "themePhase"
  | "catalyst"
  | "risk"
  | "updatedAt";

export type ColumnConfig = {
  key: string;
  label: string;
  source: "core" | "json";
};

export const defaultCoreColumns: ColumnConfig[] = [
  { key: "ticker", label: "股票代码", source: "core" },
  { key: "category", label: "板块", source: "core" },
  { key: "theme", label: "主题", source: "core" },
  { key: "themePhase", label: "主题阶段", source: "core" },
  { key: "summary", label: "定位", source: "core" },
  { key: "themeBenefit", label: "主题受益", source: "core" },
  { key: "catalyst", label: "核心催化剂", source: "core" },
  { key: "risk", label: "最大风险", source: "core" },
  { key: "updatedAt", label: "更新日期", source: "core" }
];

export function getCoreValue(stock: Stock, key: string): unknown {
  const normalized = key as CoreColumnKey;
  switch (normalized) {
    case "ticker":
      return stock.ticker;
    case "summary":
      return stock.summary;
    case "category":
      return stock.categories.join(", ");
    case "theme":
      return stock.themes.join(", ");
    case "themeBenefit":
      return stock.themeBenefit;
    case "themePhase":
      return stock.themePhase;
    case "catalyst":
      return stock.catalyst;
    case "risk":
      return stock.risk;
    case "updatedAt":
      return stock.updatedAt;
    default:
      return "";
  }
}

export function formatCellValue(key: string, value: unknown): string {
  if (key === "updatedAt") {
    return value ? new Date(String(value)).toLocaleDateString() : "-";
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined || value === "") return "-";
  return JSON.stringify(value);
}
